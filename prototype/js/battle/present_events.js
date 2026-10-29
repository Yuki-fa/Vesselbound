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

// 受け口の違いはカード情報の供給だけ。発動元の判定とDOMの終了監視は共通実装へ渡す。
function presentBeginActionBannerEvent(ev, events, index) {
  return typeof actionBannerEnterEvent === 'function' ? actionBannerEnterEvent(ev, events, index) : null;
}
function presentEndActionBannerEvent(scope) {
  if (typeof actionBannerLeaveEvent === 'function') actionBannerLeaveEvent(scope);
}

// コア／保存frameが体を書き換える前に、描画中の姿を別に控える。
// 数値の据え置きとは独立し、途中の再描画・同じ体の複数回変身でも先の絵を出さない。
function presentHoldForms(units) {
  const held = (units || []).filter(Boolean).map(unit => [unit, battleFxShownForm(unit)]);
  held.forEach(([unit, form]) => battleFxHoldForm(unit, { ...form }));
  return () => held.forEach(([unit, form]) => {
    if (form === unit) battleFxReleaseForm(unit);
    else battleFxHoldForm(unit, form);
  });
}

// LABの発動単位・直列化はこの共通入口だけで管理する（受け口はデータ供給だけ）。
let _presentLabLists = new WeakMap();
let _presentLabClaims = new WeakMap();
let _presentLabContacts = new WeakMap();
let _presentLabSummons = new WeakMap();
let _presentContactHits = new WeakSet();
let _presentDamageImpacts = new WeakSet();
let _presentStatChangesShown = new WeakSet();
let _presentLabOrigins = {death:new Map(),shield:new Map()};
let _presentDeathOrigins = new WeakMap();
function presentLabEventHandled(ev) { const plan=ev&&_presentLabClaims.get(ev); return !!(plan&&!plan.hitReactions?.has(ev)); }
function presentLabOwnsAttackMotion(ev) { return !!(ev && ev.controlled && _presentLabClaims.get(ev)?.code==='C098'); }
function presentResetLabEvents() { _presentLabLists = new WeakMap(); _presentLabClaims = new WeakMap(); _presentLabContacts=new WeakMap(); _presentLabSummons=new WeakMap(); _presentContactHits = new WeakSet(); _presentDamageImpacts = new WeakSet(); _presentStatChangesShown = new WeakSet(); _presentLabOrigins={death:new Map(),shield:new Map()}; _presentDeathOrigins=new WeakMap(); presentResetSummonPreview(); }
// 死亡位置は生きていたDOMを消す前に、イベントごとに固定する。
// 束の後半が既に盤面から消えていても、以前倒れた別の体の位置へ戻さない。
function _presentRememberDeathOrigin(ev, unit) {
  if (_presentDeathOrigins.has(ev)) return _presentDeathOrigins.get(ev);
  const rect = unit && typeof battleFxRect==='function' ? battleFxRect(unit,ev.side==='p2'?'enemy':'ally',ev.lastVisualRect) : null;
  const entry = unit && rect ? {unit,rect:{...rect,element:null}} : null;
  _presentDeathOrigins.set(ev,entry);
  return entry;
}
// 2026-10-11: 予測や接触からの固定遅延を使わず、確定ダメージを表示する瞬間に共通の振動を始める。
// 通常・反撃・効果・範囲・飛び道具ともこの入口。強さ／閾値／尺は既存の振動設定が決める。
// 2026-10-12 利用者指定：画面が振動するのは「攻撃で実際に高いダメージを与えた時」だけ。
// 反撃（ATKの低い体がATKの高い体へ攻撃した時に受ける反撃など）・効果ダメージ・毒などでは振動しない。
function presentDamageShakes(ev) {
  return !!ev && ev.damageKind === 'combat' && !ev.counter;
}
function presentDamageImpact(ev) {
  if (!ev || _presentDamageImpacts.has(ev) || !(Number(ev.amount) > 0)) return;
  if (!presentDamageShakes(ev)) return;
  _presentDamageImpacts.add(ev);
  if (typeof _battleScreenShakeTier === 'function' && !_battleScreenShakeTier(ev.amount)) return;
  if (typeof triggerBattleScreenShake === 'function') triggerBattleScreenShake({damage:ev.amount});
}
function _presentLabContext(events) {
  let context = _presentLabLists.get(events);
  if (!context) { context = {active:null,retriggers:new Set()}; _presentLabLists.set(events,context); }
  return context;
}
function _presentLabSource(ev) {
  return typeof actionBannerPresentationApi === 'function' && typeof presentActionBannerSourceUnfiltered === 'function'
    ? presentActionBannerSourceUnfiltered(ev,actionBannerPresentationApi()) : null;
}
// 2026-10-12: 追加21種も既存の発動単位・待ち・claimsへ接続する。
// 回数と対象はイベント列そのもの。盤面の効果計算やランダムな対象の再抽選はしない。
function _presentLab1012Plan(code, ev, events, index, api, source) {
  if(!presentLab1012EventMatches(code,ev))return null;
  const find=id=>api.findUnit('p1',id)||api.findUnit('p2',id);
  const sourceId=ev.sourceId||ev.unitId,owner=find(sourceId)||source&&source.card;
  if(!owner)return null;
  const data=typeof actionBannerPresentationApi==='function'?actionBannerPresentationApi():null;
  const own=data?data.ownCard(owner):owner;
  // エンチャントが持つ効果は、そのエンチャントの本文で発動の種類を確かめる（2026-10-22 シート改訂で多くの効果がエンチャントへ移った）。
  const textCard=source&&source.kind==='enchant'?source.card:own;
  const trigger={C001:'mana',C009:'mana',E027:'injury',E043:'death',C075:'release',E031:'attack',C091:'opening',C124:'release',C039:'death',C044:'injury',C092:'passive',C107:'release',C108:'injury',C120:'opening',C122:'release',C014:'injury',EN043:'injury',E056:'death',C071:'mana',C086:'mana',C099:'mana',E024:'passive'}[code];
  if(!presentActionBannerEffectText(textCard,trigger))return null;
  const members=[ev];
  for(let i=index+1;i<events.length;i++){
    const next=events[i];if(!next||['effect_flash','mana_threshold','turn_begin','battle_end','attack'].includes(next.type))break;
    if(code==='C107')break; // 1発＝コアのdamage1件（フィーンドの演出。2026-10-22 シート改訂で C099 から C082 へ）。対象・弾数をまとめ直さない。
    if(ev.type==='mana_threshold'){
      if(next.sourceId!=null&&next.sourceId!==sourceId)break;
      if(['mana_gain','keyword_effect'].includes(next.type))members.push(next);
      else if(!['log'].includes(next.type))break;
    }else if(code==='C039'||code==='C044'||code==='C092'){
      if(next.type==='stat_change'&&next.reason==='summon_buff'&&next.sourceId===sourceId)members.push(next);else break;
    }else if(['C124','C108','C120'].includes(code)&&presentLab1012EventMatches(code,next)&&next.sourceId===sourceId)members.push(next);
    else break;
  }
  // シャナの付与は、召喚の実体イベントより前に来る。対象の写しを控え、登場してから同じ波を見せる。
  const joining=code==='C092'?events.slice(index+1).find(e=>e.type==='summon'&&members.some(m=>m.unitId===e.unit?.id)):null;
  let targets=members.filter(e=>e.type==='stat_change'||e.type==='keyword_effect'||e.type==='damage')
    .map(e=>find(e.unitId)||(joining?.unit.id===e.unitId?joining.unit:null)).filter(Boolean);
  let value=1,contactEvent=null,sourceRect=null,colors=null;
  if(['C009','E027','E043','C075','E031','C122','E056'].includes(code))targets=[owner];
  if(code==='C009'&&!members.some(e=>e.type==='mana_gain'&&Number(e.amount)>0))return null;
  if(['C071','C086','C099'].includes(code)&&!targets.length)return null;
  if(code==='C091'){
    colors=ev.colorSources||[];targets=colors.map(c=>find(c.unitId)).filter(Boolean);value=colors.length;
    if(!value)return null;
  }
  if(code==='C124'){
    if(!targets.length)return null;const first=targets[0].id;
    value=members.filter(e=>e.unitId===first).length;targets=[...new Set(targets)];
  }
  if(code==='C120'){value=targets.length;if(!value)return null;}
  else if(code!=='C124')targets=[...new Set(targets)];
  if(code==='C044')value=2;
  if(code==='C092'){value=Number(ev.hp)||1;if(!targets.length)return null;}
  if(code==='E043'||code==='E056')sourceRect=battleFxRect(owner,owner.side==='p2'?'enemy':'ally');
  if(code==='E056'||code==='E024')value=Number(ev.gained);
  if(code==='E024'){
    const victim=find(ev.victimId);if(!victim)return null;
    targets=[victim];sourceRect=battleFxRect(victim,ev.victimSide==='p2'?'enemy':'ally');
  }
  if(code==='E031'){
    for(let i=index+1;i<events.length;i++){
      const next=events[i];if(['turn_begin','battle_end'].includes(next.type))break;
      if(next.type==='attack'&&next.attackerId===owner.id&&next.attackVisual!==false){contactEvent=next;break;}
    }
  }
  if(PRESENT_LAB_REACTION_CODES.has(code)){
    // 負傷の発光の直後に続く本人の割り込み攻撃だけを見る（次の発光・手番の区切りで止める）。
    // 列の最後まで探すと、別の負傷（戦闘ダメージで割り込まない時）に後の割り込み攻撃を拾い、
    // イベント列を全部持つオンラインだけ演出が出ていた（2026-10-23 present_parity で検出）。
    let next=null;
    for(let i=index+1;i<events.length;i++){
      const e=events[i];if(!e)continue;
      // 割り込みでも本人の攻撃効果は発動する。その発光を次の負傷の区切りと取り違えない。
      if(e.type==='effect_flash'&&e.unitId===owner.id&&e.trigger==='attack')continue;
      if(['effect_flash','turn_begin','battle_end'].includes(e.type))break;
      if(e.type==='attack'&&e.reactionSourceId===owner.id){next=e;break;}
    }
    if(!next)return null;targets=[find(next.targetId)].filter(Boolean);members.push(next);
  }
  const plan={code,spec:presentLabFx(code),owner,targets,members,value,colors,sourceRect,contactEvent,events,index,
    side:owner.side==='p2'?'enemy':'ally',generation:battleFxGeneration(),started:false,done:null,impact:new Map(),gains:[]};
  if(joining){plan.summonEvent=joining;_presentLabSummons.set(joining,[..._presentLabSummons.get(joining)||[],plan]);}
  members.forEach(e=>_presentLabClaims.set(e,plan));_presentLabClaimHitReactions(plan,events);return plan;
}
function presentLabManaGainVfx(ev,unit,side){
  const plan=_presentLabClaims.get(ev);
  if(plan&&plan.contactEvent){plan.manaGain={unit,side};return false;}
  if(plan&&PRESENT_LAB_1012_CODES.has(plan.code))return _presentLabManaAfter(plan,unit,side);
  return !!(unit&&Number(ev.amount)>0&&typeof playManaGainVfx==='function'&&playManaGainVfx(unit,side));
}
function _presentLabManaAfter(plan,unit,side){
  if(!unit||typeof playManaGainVfx!=='function')return false;
  let finish;const after=new Promise(resolve=>{finish=resolve;});
  plan.after=plan.after?Promise.all([plan.after,after]):after;
  const shown=playManaGainVfx(unit,side,{rect:plan.sourceRect,onDone:finish});if(!shown)finish();return !!shown;
}
// 陣の中央にカード1枚分の起点を作る（field）。大きさは陣のカードに合わせる（無い時は陣の高さから）。
function _presentLabFieldOrigin(side) {
  if (typeof document === 'undefined' || typeof VbFx === 'undefined') return null;
  const field = document.getElementById(side === 'p2' ? 'f-enemy' : 'f-ally');
  if (!field || !field.isConnected) return null;
  const r = VbFx.rect(field); if (!(r.width > 0 && r.height > 0)) return null;
  const slot = field.querySelector('.slot[data-unit-id]'), s = slot && slot.isConnected ? VbFx.rect(slot) : null;
  const w = s && s.width > 0 ? s.width : Math.min(r.width, r.height * .6), h = s && s.height > 0 ? s.height : w * 1.5;
  const left = r.left + (r.width - w) / 2, top = r.top + (r.height - h) / 2;
  return { rect: { ...r, left, top, x: left, y: top, width: w, height: h, right: left + w, bottom: top + h, element: null } };
}
// 召喚の前に溜めを見せる演出。合図（impact）まで待ってから、既存の登場演出でカードを出す。
const PRESENT_LAB_BEFORE_SUMMON = new Set(['C041','R017','R020','map:duplicate']);
function _presentLabPlan(ev, events, index, api, context) {
  let source = _presentLabSource(ev);
  // マナ効果を直接発動するペガサスは、結果が別カードのmana_thresholdになる。
  if(!source&&ev.type==='effect_flash'&&typeof actionBannerPresentationApi==='function') {
    const data=actionBannerPresentationApi(), unit=data.unit(ev.unitId);
    if(unit&&['C035','C096'].includes(unit.no||unit.artCode)&&
      /効果を(?:\d+回)?発動する/.test(presentActionBannerEffectText(data.ownCard(unit),ev.trigger)))
      source={card:unit,side:unit.side,kind:'character'};
    // 新本文には結界獲得が無いので、続く割り込み攻撃を持つ負傷の発光から怒りの演出を始める。
    if(unit&&PRESENT_LAB_REACTION_CODES.has(unit.no||unit.artCode)&&ev.trigger==='injury')
      source={card:unit,side:unit.side,kind:'character'};
    // アトラス（常時：受けたダメージを他の味方へ割り振る）は、常時の発光から割り振りのダメージへ（2026-10-26 利用者指摘「アトラスのVFXが出ていない」：発生元が引けず出ていなかった）。
    if(unit&&(unit.no||unit.artCode)==='C005'&&ev.trigger==='passive')
      source={card:unit,side:unit.side,kind:'character'};
    // 団結（E055）で接続した体の常時の発光も同じ形（2026-10-27 利用者指摘「団結のVFXが出ません」）。
    else if(unit&&ev.trigger==='passive'&&Array.isArray(unit._uniteGroups)&&unit._uniteGroups.length)
      source={card:{no:'E055',id:unit.id},side:unit.side,kind:'enchant'};
  }
  let code = ev.type === 'mana_threshold' ? String(ev.effectNo || '')
    : source && String(source.card.no || source.card.artCode || '');
  if(source&&source.kind==='character'&&ev.type!=='mana_threshold'&&ev.type!=='effect_flash') {
    const data=actionBannerPresentationApi(), trigger=presentActionBannerTrigger(ev,data.hint(source.card.id));
    const own=data.ownCard(source.card);
    if(ev.effectSource===false||!(presentActionBannerEffectText(own,trigger)||presentActionBannerEffectText(own,'passive'))) code='';
  }
  if(source&&source.kind==='item'&&/^\d{1,3}$/.test(code)) code='I'+code.padStart(3,'0');
  // 魔導板の力は番号を持たない。力のid（life・resonance）で引く（2026-10-17）。
  if(source&&source.kind==='map'&&source.card&&source.card.id) code='map:'+source.card.id;
  // 複製の力のコピー召喚は、発動元のキャラクターではなくマスの力の演出を出す（ツインデビルの本文のコピーとは分ける）。
  if(ev.type==='summon'&&ev.unit&&ev.unit._openingDuplicate){
    const original=api.findUnit(ev.side,ev.sourceId);
    if(original&&original._mapPanelPower==='duplicate') code='map:duplicate';
  }
  if (ev.blockedBy === 'great_shield') code = 'E062';
  // アラストルが付与した「負傷：ランダムな敵に1ダメージ」のダメージは、逆上（E032）と同じ演出（2026-10-26 利用者指定）。
  if (ev.type === 'damage' && ev.reason === 'granted_injury_damage') code = 'E032';
  if(!presentLabFx(code)) {
    if(ev.type==='keyword_effect'&&ev.effect==='weaken') code=getKeywordAssetKey('弱体');
  }
  if (!presentAssignedLabEventMatches(code,ev)) return null;
  if(PRESENT_LAB_1012_CODES.has(code))return _presentLab1012Plan(code,ev,events,index,api,source);
  const spec = typeof presentLabFx === 'function' ? presentLabFx(code) : null;
  if (!spec || ['S001',getKeywordAssetKey('復活'),getKeywordAssetKey('全体攻撃')].includes(code)) return null;
  if (ev.type === 'effect_flash' && !['C035','C096','C005','E055'].includes(code)) return null;
  if (ev.type === 'attack' && !ev.controlled) return null;
  if (ev.type === 'damage' && ev.damageKind === 'combat' && code !== 'E062') return null;
  if (ev.type === 'revive' || ev.type === 'shield_lost' || ev.type === 'shield_set') return null;
  // mana_thresholdのeffectNoはカード定義を指すが、定義のidは盤面のユニットIDではない。
  // 発動者はコアのunitIdで引く。後続keyword/summonから拾い直す代用経路に落とさない。
  const sourceId = code === 'E062' || ev.type === 'mana_threshold' ? ev.unitId : ev.sourceId || source && source.card.id || ev.unitId;
  const ownerSide = source && source.side || ev.side;
  const find = id => api.findUnit('p1',id) || api.findUnit('p2',id);
  // 強化カードの「自分に出す」演出（錬成・苦悶の刻印）は、発生元IDが無く、強化カードのIDは盤面の体ではない。
  // その強化を付けた体（イベントのunitId）を発動者にする（2026-10-17）。
  const owner = find(sourceId) || (source && source.kind === 'item' ? api.units(ownerSide).find(Boolean) : null)
    || (source && source.kind === 'enchant' && spec[2] === 'self' ? find(ev.unitId) : null);
  const members = presentLabEffectEvents(events,index,code,sourceId).filter(e=>presentAssignedLabEventMatches(code,e));
  let targets = members.filter(e=>!['mana_threshold','effect_flash'].includes(e.type)).map(e=>find(e.type==='summon'&&e.unit?e.unit.id:e.unitId)).filter(Boolean);
  // 2026-10-25 アトラス：常時の発光から、続く「割り振られたダメージ」（damage.redirectedFrom＝アトラス）を受けた味方へ。
  // 団結（E055、接続した味方へ分散）も同じ形（2026-10-26）。
  if (ev.type === 'effect_flash' && (code === 'C005' || code === 'E055')) {
    const shared=[];for(let i=index+1;i<(events||[]).length;i++){const e=events[i];if(!e||['attack','turn_begin','battle_end'].includes(e.type))break;
      if(e.type==='damage'&&e.redirectedFrom===ev.unitId)shared.push(e);}
    targets=[...new Set(shared.map(e=>find(e.unitId)).filter(Boolean))];
    if (!targets.length) return null;
  } else if (ev.type === 'effect_flash') {
    const next = presentLabManualTarget(events,index,code);
    targets = next ? [find(next.unitId)].filter(Boolean) : [];
    if (!targets.length) return null;
  }
  if (spec[2] === 'self') targets = [owner].filter(Boolean);
  if (spec[2] === 'green') targets = api.units(ownerSide).filter(u=>u && u.color==='緑' && (typeof presentShownHp==='function'?presentShownHp(u):u.hp)>0);
  if (spec[2] === 'howl') targets = [];
  if (spec[2] === 'others') targets = targets.filter(u=>u.id!==sourceId);
  if (spec[2] === 'pair') targets = [find(ev.attackerId),find(ev.targetId)].filter(Boolean);
  if (spec[2] === 'foes') targets = targets.filter(u=>api.units(ownerSide==='p2'?'p1':'p2').includes(u));
  targets = [...new Set(targets)];
  if (['C011','EN060','E028'].includes(code) && !targets.length) return null;
  // field：発動元のカードが盤面に無い効果（不死・鬼神・魔力の指輪）。その陣営の陣の中央を起点にする。
  if (spec[2] === 'field') targets = [];
  const origin = spec[2] === 'dead' ? _presentLabOrigins.death.get(ownerSide) : spec[2] === 'lost' ? _presentLabOrigins.shield.get(ownerSide)
    : spec[2] === 'field' ? _presentLabFieldOrigin(ownerSide) : null;
  if (!owner && !origin && !targets.length) return null;
  if (spec[2] === 'morph') {
    targets = [...new Set(members.filter(e=>e.type==='transform').map(e=>find(e.unitId)).filter(Boolean))];
    if (!targets.length) return null;
    targets.forEach(u=>{
      const shown = battleFxShownForm(u);
      const old = shown !== u ? shown : actionBannerPresentationApi().unit(u.id) || u;
      if (old && typeof battleFxHoldForm === 'function') battleFxHoldForm(u,{...old});
    });
  }
  const sourceRect = origin && origin.rect;
  const plan = {code,spec,owner,targets,members,events,index,sourceRect:sourceRect && (spec[2]==='dead'?{...sourceRect,element:null}:sourceRect),
    side:ownerSide==='p2'?'enemy':'ally',generation:battleFxGeneration(),started:false,done:null,impact:new Map(),gains:[]};
  members.forEach(e=>{ if (e.type!=='death' && e.type!=='revive') _presentLabClaims.set(e,plan); });
  _presentLabClaimHitReactions(plan,events);
  return plan;
}
// 同じ効果が同じタイミングで続けて処理される時（複数の野生の力の開戦など）は、発動元ごとに順に出さず同時に出す（2026-10-26 利用者指定）。
// マナ到達の波と同じ形（manaPlans）でまとめる。別の効果・攻撃・手番の区切りが来たらそこまで。同じ発動元の繰り返しはまとめない。
function _presentLabSameEffectPlan(plan, ev, events, index, api, context) {
  if (ev.type === 'mana_threshold' || plan.manaPlans || !plan.owner) return plan;
  const plans = [plan], owners = new Set([plan.owner.id]);
  for (let i = index + 1; i < events.length; i++) {
    const next = events[i];
    if (!next || ['attack','turn_begin','battle_end','death','summon','mana_threshold'].includes(next.type)) break;
    if (next.type === 'effect_flash' || next.type === 'log' || _presentLabClaims.has(next)) continue;
    const source = _presentLabSource(next), code = source && String(source.card.no || source.card.artCode || '');
    if (code !== plan.code) break;
    if (owners.has(next.sourceId || next.unitId)) continue;
    const peer = _presentLabPlan(next,events,i,api,context);
    if (!peer) break;
    if (!peer.owner || peer.code !== plan.code || owners.has(peer.owner.id)) {
      // まとめない計画は取り消す（その発動は、イベントの順が来た時に通常どおり作り直す）。
      for (const member of peer.members) if (_presentLabClaims.get(member) === peer) _presentLabClaims.delete(member);
      for (const reaction of peer.hitReactions || []) if (_presentLabClaims.get(reaction) === peer) _presentLabClaims.delete(reaction);
      break;
    }
    owners.add(peer.owner.id); plans.push(peer);
  }
  if (plans.length < 2) return plan;
  // 音は発動ごとに鳴らす（同時に出すだけで、各対象の音の回数は今までと同じ）。
  const group = { ...plan, manaPlans: plans, sameEffect: true, started: false, done: null, gains: [], impact: new Map(),
    members: plans.flatMap(p => p.members), targets: [...new Set(plans.flatMap(p => p.targets))] };
  for (const peer of plans) {
    for (const member of peer.members) _presentLabClaims.set(member,group);
    for (const reaction of peer.hitReactions || []) _presentLabClaims.set(reaction,group);
  }
  group.hitReactions = new Set(plans.flatMap(p => [...p.hitReactions || []])); group.hitGains = [];
  return group;
}
// 同じマナ到達で発動した固有VFXも、発動元ごとの尺を直列に足さない。
// 発動元と対象は各planに保持し、全員を同時に開始してから1組として完了を待つ。
function _presentLabManaWavePlan(plan, ev, events, index, api, context) {
  if (ev.type !== 'mana_threshold') return plan;
  const info = presentManaWaveInfo(events,index);
  if (!info || info.group.thresholds.length < 2) return plan;
  const plans = [plan];
  for (const next of info.group.thresholds) {
    if (next === ev || _presentLabClaims.has(next)) continue;
    const peer = _presentLabPlan(next,events,events.indexOf(next),api,context);
    if (peer) plans.push(peer);
  }
  if (plans.length < 2) return plan;
  const group = { ...plan, manaPlans: plans, started: false, done: null, gains: [], impact: new Map(),
    members: plans.flatMap(p => p.members), targets: [...new Set(plans.flatMap(p => p.targets))] };
  for (const peer of plans) {
    for (const member of peer.members) _presentLabClaims.set(member,group);
    for (const reaction of peer.hitReactions || []) _presentLabClaims.set(reaction,group);
  }
  group.hitReactions = new Set(plans.flatMap(p => [...p.hitReactions || []])); group.hitGains = [];
  return group;
}
function _presentLabClaimHitReactions(plan,events){
  // 命中に付随する毒・邪眼・衝撃は固有効果の終了後へ貯めない。
  // ダメージの直後にコアが出した同じ命中のイベントだけを、その着弾へ結び付ける。
  plan.hitReactions=new Set();plan.hitGains=[];
  for(const hit of plan.members.filter(e=>e.type==='damage')){
    for(let i=events.indexOf(hit)+1;i<events.length;i++){
      const next=events[i];
      if(!next||['mana_threshold','effect_flash','attack','turn_begin','death'].includes(next.type)) break;
      if(next.type==='damage'){if(plan.members.includes(next)) continue;break;}
      const reaction=next.type==='keyword_effect'&&['poison','evil_eye','weaken'].includes(next.effect)
        ||next.type==='stat_change'&&next.reason==='evil_eye';
      if(reaction&&next.unitId===hit.unitId&&next.side===hit.side&&next.sourceId===hit.sourceId){
        plan.hitReactions.add(next);_presentLabClaims.set(next,plan);
      }
    }
  }
}
function _presentLabStart(plan, options) {
  if (!plan || plan.started || plan.summonEvent&&!plan.summonReady || typeof playBattleLabFx !== 'function') return;
  plan.started = true;
  const mana = plan.events[plan.index]?.type === 'mana_threshold' ? plan.events[plan.index] : null;
  plan.repeat = options && options.repeat != null ? options.repeat
    : presentEffectRun(plan.events,plan.index,mana
      ? `lab:${plan.side}:mana:${presentManaEffectKey(mana)}`
      : `lab:${plan.side}:${plan.owner?.id||''}:${plan.code}`).repeat;
  if (plan.manaPlans) {
    plan.eventImpact = new WeakMap();
    plan.manaPlans.forEach((peer,i) => {
      _presentLabStart(peer,{repeat:plan.repeat,silent:i>0&&!plan.sameEffect});
      for (const ev of peer.members) {
        const impact = peer.eventImpact?.get(ev) || peer.impact.get(String(ev.unitId));
        if (impact) plan.eventImpact.set(ev,impact);
      }
    });
    plan.done = Promise.all(plan.manaPlans.map(p => p.done));
    return;
  }
  const resolvers = [],statEvents=plan.members.filter(e=>e.type==='stat_change');
  plan.eventImpact=new WeakMap();
  plan.targets.forEach((u,i)=>{
    const promise=new Promise(resolve=>resolvers[i]=resolve);plan.impact.set(String(u.id),promise);
    if(plan.code==='C120'&&statEvents[i])plan.eventImpact.set(statEvents[i],promise);
  });
  const pulseResolvers=[];
  const cueTimes=plan.code==='C124'?battleFxPulseTimes(plan.spec[0],plan.value):null;
  if(cueTimes)statEvents.forEach((ev,i)=>plan.eventImpact.set(ev,new Promise(resolve=>{
    const wave=Math.floor(i/plan.targets.length);(pulseResolvers[wave]||(pulseResolvers[wave]=[])).push(resolve);
  })));
  plan.done = playBattleLabFx(plan.code,plan.owner,plan.targets,{side:plan.side,sourceRect:plan.sourceRect,
    durationMs:plan.repeat
      ? presentEffectRunDuration(true)/((PRESENT_LAB_REACTION_CODES.has(plan.code)?PRESENT_LAB_REACTION_AURA_END:1)*(typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1))
      : PRESENT_LAB_REACTION_CODES.has(plan.code)?PRESENT_LAB_REACTION_FLASH_MS/PRESENT_LAB_REACTION_AURA_END/(typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1):undefined,
    value:plan.value,colors:plan.colors,silent:!!(options && options.silent),
    impactTimes:plan.code==='C120'?plan.targets.map((_,i)=>.43+.49*i/Math.max(1,plan.targets.length-1)):null,
    cueTimes,onCue:i=>(pulseResolvers[i]||[]).forEach(resolve=>resolve()),
    onImpact:i=>{ if(resolvers[i])resolvers[i](); }});
  // ミノタウロスの激怒は定義の前半（オーラ）だけを見せ、オーラが消えた時点で次へ進む（後半は value=1 では何も描かない）。
  if(PRESENT_LAB_REACTION_CODES.has(plan.code)){const shown=plan.done;
    plan.done=Promise.race([shown,new Promise(resolve=>battlePresentationSetTimeout(resolve,presentEffectRunDuration(plan.repeat,PRESENT_LAB_REACTION_FLASH_MS)))]).then(()=>{VbFx.stop({name:plan.spec[0]});return true;});}
  plan.done.finally(()=>{resolvers.forEach(resolve=>resolve());pulseResolvers.flat().forEach(resolve=>resolve());});
}
async function _presentLabFinish(plan) {
  if (!plan) return;
  if (plan.done) await plan.done;
  if(plan.after)await plan.after;
  if(plan.hitGains)await Promise.all(plan.hitGains);
  if(plan.generation!=null&&plan.generation!==battleFxGeneration()) return;
  // 結界・復活の獲得は、元の効果が消えてから同じ波で続ける。
  for (const code of [getKeywordAssetKey('弱体'),getKeywordAssetKey('邪眼'),getKeywordAssetKey('結界','gain'),getKeywordAssetKey('復活','gain'),
    getKeywordAssetKey('隠密'),getKeywordAssetKey('防戦')]) {
    if(plan.generation!=null&&plan.generation!==battleFxGeneration()) return;
    const units = [...new Set(plan.gains.filter(g=>g.code===code).map(g=>g.unit))];
    // 弱体・邪眼の付与は見た目だけ続ける。音は元の固有演出のSEで足り、重ねると調和しない（2026-10-18 利用者指摘：グレムリン・ウンディーネ）。
    // 結界・復活の獲得の音は残す（スプリガン等は獲得SEへつなげる）。
    const silent = code===getKeywordAssetKey('弱体') || code===getKeywordAssetKey('邪眼');
    if (units.length) await playBattleLabFx(code,units[0],units,{side:_battleFxSide(units[0]),silent,
      durationMs:plan.repeat?presentEffectRunDuration(true)/(typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1):undefined});
  }
  plan.gains.length=0;
  // 毒の付与も元の演出へ引き継ぐ。cloneイベントなので固有演出のclaimを受けない。
  for(const gain of plan.keywordGains||[])presentKeywordEffectEvent({...gain.ev},gain.api);
  plan.keywordGains=[];
}
// ダメージ等を「VFXが当たった瞬間」まで待たせる演出（ワーム・援護射撃の弾・隕石の巻物）。
// 隕石の巻物は、隕石が墜落した直後にダメージを出す（2026-10-12 利用者指摘：VFXより先にダメージが出ていた）。
// アラクネ（C013）は熱波が届いた瞬間に強化とダメージを同時に出す（2026-10-15）。
// 竜の契約（E008）・逆上（E032）・嵐の指輪（R023）・苦行の指輪（R012）・受難の刻印（E103）も着弾の瞬間に数値を出す（2026-10-17）。
const PRESENT_LAB_WAIT_IMPACT = new Set(['C069','E067','I006','C124','C071','C011','EN060','C086','C099','C120','C107','C013','E008','E032','R023','R012','E103']);
async function presentLabBeginEvent(ev, events, index, api) {
  // 終戦へ移る前に、現在の効果とVFXを従来の速度で完了させる。
  if (!ev || !Array.isArray(events)) return;
  const context = _presentLabContext(events), claimed = _presentLabClaims.get(ev);
  if (context.active && context.active !== claimed) { await _presentLabFinish(context.active); context.active = null; }
  if (presentIsBattleEndEffectEvent(ev) && !presentBattleEndPhase()) {
    if (typeof _waitForPendingVfx === 'function') await _waitForPendingVfx();
    presentNoteBattleEndEvent(ev);
  }
  if (typeof playBattleLabFx !== 'function' || typeof VbFx === 'undefined') return;
  presentAdvanceSummonPreview(ev);
  if (ev.type==='death' || ev.type==='shield_lost') {
    const u = api.findUnit(ev.side,ev.unitId);
    const origins = _presentLabOrigins[ev.type==='death'?'death':'shield'];
    const entry = ev.type==='death' ? _presentRememberDeathOrigin(ev,u)
      : u && {unit:u,rect:battleFxRect(u,ev.side==='p2'?'enemy':'ally',ev.lastVisualRect)};
    if (entry) origins.set(ev.side,entry);
    else origins.delete(ev.side);
  }
  // 死亡位置の絵が残っている間に、実際の死亡効果／撃破の血を開始する。
  // 空の合図だけでは始めず、先読みした実体イベントを同じclaimsへ結び付ける。
  if(ev.type==='death'){
    for(let i=index+1;i<events.length;i++){
      const next=events[i];if(['attack','turn_begin','battle_end','death'].includes(next.type))break;
      const ownerId=next.sourceId||next.unitId,owner=api.findUnit('p1',ownerId)||api.findUnit('p2',ownerId);
      // エンチャントの効果（2026-10-22 シート改訂でマナの残滓・血の雫・渇望へ移った）は、エンチャントの番号で引く。
      const nextSource=_presentLabSource(next);
      const viaEnchant=nextSource&&nextSource.kind==='enchant';
      const code=viaEnchant?String(nextSource.card.no||nextSource.card.artCode||''):owner&&(owner.no||owner.artCode);
      if(!['E043','C039','E056','E024'].includes(code)||_presentLabClaims.has(next)||!presentLab1012EventMatches(code,next))continue;
      if(code==='E024'?next.victimId!==ev.unitId:ownerId!==ev.unitId)continue;
      const plan=_presentLab1012Plan(code,next,events,i,api,viaEnchant?nextSource:{card:owner});
      if(plan){context.active=plan;_presentLabStart(plan);await plan.done;
        if(['E056','E024'].includes(code)&&typeof battleFxHideConsumedCard==='function')battleFxHideConsumedCard(code==='E056'?owner:plan.targets[0]);
      }
      break;
    }
  }
  // 実際に再発火した開戦効果の前だけ、因果メタデータのインプ→対象を点火する。
  if(ev.retriggerKey&&!context.retriggers.has(ev.retriggerKey)){
    const body=[];
    for(let i=index;i<events.length;i++){const e=events[i];if(i>index&&(['attack','turn_begin','battle_end'].includes(e.type)||e.type==='effect_flash'&&e.trigger==='opening'&&e.retriggerKey!==ev.retriggerKey))break;body.push(e);}
    // applyHitが外部のemitへ出したダメージも、実際の発動対象IDで拾う。
    const result=body.some(e=>!['effect_flash','log'].includes(e.type)&&
      (e.retriggerKey===ev.retriggerKey||e.sourceId===ev.retriggerTargetId&&e.type==='damage'));
    const owner=api.findUnit('p1',ev.retriggerSourceId)||api.findUnit('p2',ev.retriggerSourceId);
    const target=api.findUnit('p1',ev.retriggerTargetId)||api.findUnit('p2',ev.retriggerTargetId);
    if(result&&owner&&target&&(owner.no||owner.artCode)==='C119'){
      context.retriggers.add(ev.retriggerKey);await playBattleLabFx('C119',owner,[target],{side:owner.side==='p2'?'enemy':'ally'});
    }
  }
  // 先制（K006）：先制を持つ体が先制を持たない相手を攻撃する時、当たる瞬間に相手の上へ一閃を出す（2026-10-27 利用者指定）。
  // 攻撃を止めないよう、接触の受け口（presentAttackContactHits）で待たずに再生する。
  if(ev.type==='attack'&&ev.attackVisual!==false&&!ev.effectOnly&&typeof coreUnitHasKeyword==='function'&&presentLabFx(getKeywordAssetKey('先制'))){
    const find=id=>api.findUnit('p1',id)||api.findUnit('p2',id);
    const attacker=find(ev.attackerId),target=find(ev.targetId);
    if(attacker&&target&&coreUnitHasKeyword(attacker,'先制')&&!coreUnitHasKeyword(target,'先制'))_presentFirstStrikes.set(ev,{attacker,target});
  }
  // 大盾（E062）は防いだ反撃のイベントより前、攻撃がぶつかった瞬間に出す（2026-10-27 利用者指定）。
  if(ev.type==='attack'&&typeof presentAttackContactHitEvents==='function'){
    for(const hit of presentAttackContactHitEvents(events,index)){
      if(hit.blockedBy!=='great_shield'||_presentLabClaims.has(hit))continue;
      const shield=_presentLabPlan(hit,events,events.indexOf(hit),api,context);
      if(!shield)continue;shield.contactEvent=ev;
      _presentLabContacts.set(ev,[...(_presentLabContacts.get(ev)||[]),shield]);
    }
  }
  if (claimed) {
    if(['C011','EN060'].includes(claimed.code)&&!context.active)context.active=claimed;
    if(PRESENT_LAB_1012_CODES.has(claimed.code)&&!claimed.contactEvent&&!context.active&&ev.type!=='attack')context.active=claimed;
    if(ev.type==='mana_gain'&&PRESENT_LAB_1012_CODES.has(claimed.code)&&!claimed.contactEvent)await claimed.done;
    if(PRESENT_LAB_REACTION_CODES.has(claimed.code)&&ev.type==='attack'){
      await _presentLabFinish(claimed);
      await playBattleLabFx(claimed.code,claimed.owner,claimed.targets,{side:claimed.side,value:2,silent:true,
        durationMs:presentEffectRunDuration(claimed.repeat,PRESENT_LAB_REACTION_AIM_MS)/(typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1)});context.active=null;
      return;
    }
    if(claimed.code==='C056'&&ev.type==='summon'){ await _presentLabFinish(claimed); context.active=null; }
    if (PRESENT_LAB_WAIT_IMPACT.has(claimed.code) || claimed.spec[2]==='morph') {
      const wait = claimed.eventImpact&&claimed.eventImpact.get(ev)||claimed.impact.get(String(ev.unitId)); if (wait) await wait;
    }
    return;
  }
  let plan = _presentLabPlan(ev,events,index,api,context);
  if (!plan) return;
  plan = _presentLabManaWavePlan(plan,ev,events,index,api,context);
  plan = _presentLabSameEffectPlan(plan,ev,events,index,api,context);
  // 割り込んだ別効果の前でマナVFXを閉じる。repeatの発動記録は保持する。
  if(ev.type!=='mana_threshold'&&typeof api.finishEffect==='function')await api.finishEffect();
  if(plan.contactEvent){const pending=_presentLabContacts.get(plan.contactEvent)||[];pending.push(plan);_presentLabContacts.set(plan.contactEvent,pending);return;}
  context.active = plan;
  if (ev.type !== 'mana_threshold') _presentLabStart(plan);
  if(PRESENT_LAB_1012_CODES.has(plan.code)&&['mana_gain','mana_set'].includes(ev.type))await plan.done;
  // ピクシーの捕縛・移動はLAB自身が描く。従来の攻撃クローンを重ねず、接触で既存処理へ渡す。
  if(plan.code==='C098'&&ev.type==='attack') {
    const wait=plan.impact.get(String(ev.targetId));if(wait)await wait;
  }
  if (ev.type==='summon' && PRESENT_LAB_BEFORE_SUMMON.has(plan.code) && typeof VbFx!=='undefined' && VbFx.impactMs) {
    const speed = typeof battleFxSpeed==='function' ? battleFxSpeed(plan.code) : 1;
    const ms = Math.max(0, Number(VbFx.impactMs(plan.spec[0], speed)) || 0);
    if (ms > 0) await new Promise(resolve => (typeof battlePresentationSetTimeout==='function' ? battlePresentationSetTimeout : setTimeout)(resolve, ms));
  }
  // ミノタウロス（C014）は発光で始めて、続く割り込み攻撃（claimed の attack）で締める。ここで最後まで待たない。
  if (plan.code==='C056'&&ev.type!=='mana_threshold' || ev.type==='effect_flash'&&!PRESENT_LAB_REACTION_CODES.has(plan.code)) {
    await _presentLabFinish(plan); context.active = null;
  } else if (PRESENT_LAB_WAIT_IMPACT.has(plan.code) || plan.spec[2]==='morph') {
    const wait = plan.eventImpact&&plan.eventImpact.get(ev)||plan.impact.get(String(ev.unitId)); if (wait) await wait;
  }
}
async function presentLabEndEvent(ev, events, index, api) {
  if (!ev || typeof playBattleLabFx !== 'function' || typeof VbFx === 'undefined') return;
  if (ev.type==='summon_buff' && typeof refreshUnitPreviewUi==='function') {
    // 場に眷属がいない発動でも、召喚する側のカード説明・ホバーをすぐ更新する。
    for (const unit of api.units(ev.side).filter(Boolean)) refreshUnitPreviewUi(unit,ev.side==='p2'?'enemy':'ally');
  }
  const context = _presentLabContext(events), plan = _presentLabClaims.get(ev);
  if (ev.type==='mana_threshold' && plan) _presentLabStart(plan);
  const unitId=ev.unitId!=null?ev.unitId:ev.type==='summon'&&ev.unit?ev.unit.id:null;
  const unit = unitId!=null ? api.findUnit(ev.side,unitId) : null;
  if (unit) {
    if(ev.type==='summon') battleFxAdvanceStates(unit,_battleFxValues(ev.unit));
    if (ev.type==='keyword_effect') {
      const previous = battleFxStateValues(unit);
      if (ev.effect==='poison') battleFxAdvanceStates(unit,{poison:previous.poison+(Number(ev.amount)||0)});
      if (ev.effect==='weaken') battleFxAdvanceStates(unit,{weaken:previous.weaken+(Number(ev.amount)||0)});
      if (ev.effect==='shield') battleFxAdvanceStates(unit,{shield:previous.shield+(Number(ev.amount)||0)});
      if (ev.effect==='keyword_gain' && ['復活','根性'].includes(ev.keyword)) battleFxAdvanceStates(unit,{[ev.keyword==='復活'?'revive':'guts']:1});
      if (ev.effect==='keyword_gain' && ['隠密','防戦'].includes(ev.keyword)) battleFxAdvanceStates(unit,{[ev.keyword==='隠密'?'stealth':'guard']:1});
    }
    if (ev.type==='stat_change' && ev.reason==='melusine_poison_double' && plan && plan.owner) {
      const factor=coreEffectNumbers(plan.owner,'攻撃',/全ての敵の毒を(\d+)倍にする/,[1])[0];
      battleFxAdvanceStates(unit,{poison:battleFxStateValues(unit).poison*factor});
    }
    if (ev.type==='revive') battleFxAdvanceStates(unit,{[ev.reason==='根性'?'guts':'revive']:0});
    if (ev.type==='shield_set' || ev.type==='shield_lost') battleFxAdvanceStates(unit,{shield:Number(ev.type==='shield_set'?ev.amount:ev.shield)||0});
    if (ev.type==='transform') {
      if(ev.unit&&typeof presentAdvanceShown==='function') presentAdvanceShown(unit,{shield:ev.unit.shield||0,weaken:ev.unit.weaken||0});
      battleFxAdvanceStates(unit,_battleFxValues(ev.unit||unit));
      if (api.render) api.render();
    }
    const gains = [];
    if(plan&&plan.spec[0]==='scylla'&&ev.type==='keyword_effect'&&ev.effect==='poison'){
      (plan.keywordGains||(plan.keywordGains=[])).push({ev,api});
    }
    if (ev.type==='keyword_effect' && ev.effect==='weaken' && (!plan||plan.code!==getKeywordAssetKey('弱体'))) gains.push(getKeywordAssetKey('弱体'));
    // 付与元の固有演出は保持し、ATK減少の合図をその後へ続ける（HPも減る場合を含む）。
    if (ev.type==='stat_change' && Number(ev.atk)<0 && (!plan||plan.code!==getKeywordAssetKey('邪眼'))) gains.push(getKeywordAssetKey('邪眼'));
    if (ev.type==='keyword_effect' && ev.effect==='shield' && Number(ev.amount)>0) gains.push(getKeywordAssetKey('結界','gain'));
    // shield_setは開戦時の初期結界にも使う。復活直後の付け直しだけ獲得として見せる。
    if(ev.type==='shield_set'&&Number(ev.amount)>0&&events[index-1]?.type==='revive'&&events[index-1].unitId===ev.unitId) gains.push(getKeywordAssetKey('結界','gain'));
    if (ev.type==='keyword_effect' && ev.effect==='keyword_gain' && ev.keyword==='復活') gains.push(getKeywordAssetKey('復活','gain'));
    // 隠密・防戦を戦闘中に得た瞬間（2026-10-25 利用者指定）。最初から持っている体は状態のループだけを出す。
    if (ev.type==='keyword_effect' && ev.effect==='keyword_gain' && ['隠密','防戦'].includes(ev.keyword)) gains.push(getKeywordAssetKey(ev.keyword));
    for (const code of gains) {
      if (plan&&plan.hitReactions?.has(ev)) plan.hitGains.push(playBattleLabFx(code,unit,[unit],{side:ev.side==='p2'?'enemy':'ally',silent:true}));
      else if (plan) plan.gains.push({code,unit});
      else {
        if(typeof api.finishEffect==='function') await api.finishEffect();
        context.active={done:playBattleLabFx(code,unit,[unit],{side:ev.side==='p2'?'enemy':'ally'}),gains:[]};
      }
    }
  }
  if(ev.type==='mana_set'&&plan&&plan.code==='C075'&&plan.owner&&Number(ev.gained)>0&&typeof playManaGainVfx==='function'){
    _presentLabManaAfter(plan,plan.owner,plan.side);
  }
  const joined=_presentLabSummons.get(ev);
  if(joined){
    for(const pending of joined){
      pending.targets=pending.targets.map(u=>api.findUnit('p1',u.id)||api.findUnit('p2',u.id)).filter(Boolean);
      pending.summonReady=true;
      if(pending.targets.length){_presentLabStart(pending);await _presentLabFinish(pending);}
    }
    _presentLabSummons.delete(ev);
  }
  if (index === events.length-1 && context.active) { await _presentLabFinish(context.active); context.active = null; }
}

async function presentFinishLabEvents(events) {
  const context=_presentLabLists.get(events);
  if(context&&context.active){await _presentLabFinish(context.active);context.active=null;}
  (events||[]).filter(ev=>ev.type==='transform').forEach(ev=>battleFxReleaseForm({id:ev.unitId}));
}

// 終戦など、数値を既に確定・書き戻し済みの出口。再計算せず同じ演出入口へ接続する。
async function presentLabCommittedEvents(events, api, showEvent) {
  const list=(events||[]).filter(Boolean);
  for(const [index,ev]of list.entries()) {
    const source=_presentLabSource(ev);
    const scope=source&&presentLabFx(source.card.no||source.card.artCode)
      ?presentBeginActionBannerEvent(ev,list,index):null;
    try {
      await presentLabBeginEvent(ev,list,index,api);
      if(showEvent)await showEvent(ev);
    } finally {
      await presentLabEndEvent(ev,list,index,api);
      if(scope)presentEndActionBannerEvent(scope);
    }
  }
}

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
  if (_presentContactHits.has(ev)) return true;
  const amount = Math.max(0, Number(ev.amount) || 0);
  const target = api.findUnit(ev.side, ev.unitId);
  if (!target) return false;
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  const damagesHp = ev.damageTo !== 'atk';
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
  const labHandled = presentLabEventHandled(ev);
  const vfxSource = !labHandled && typeof presentDamageVfxSource === 'function'
    ? presentDamageVfxSource(ev, target, source, api.ownEffectText) : null;
  // **発生元から対象へ飛ばす効果**（炎の矢・ケンタウロス）。どの効果を飛ばすかは
  // present.js の `PRESENT_PROJECTILE_EFFECTS` が唯一の実装。
  // 数値・HP・命中VFXは**着弾の瞬間**に出すので、通常の被弾演出はここで打ち切る。
  // 援護射撃のように、射手本人の固有VFXは出さず（effectSource:false）効果の弾だけを射手から飛ばすダメージ。
  // コアが damage.fxEffect に効果名を載せ、その強化カードの演出番号（E067）で飛ばす。
  const fxProjectileCode = (!labHandled && !shownElsewhere && amount > 0 && ev.fxEffect && source
    && typeof _enchantPresentationNo === 'function' && typeof presentIsProjectileEffect === 'function'
    && typeof playProjectileEffectVfx === 'function')
    ? (code => (presentIsProjectileEffect(code) ? code : ''))(String(_enchantPresentationNo(ev.fxEffect) || ''))
    : '';
  const thresholdProjectileCode = !labHandled&&!shownElsewhere&&amount>0&&source
    &&typeof presentIsProjectileEffect==='function'&&presentIsProjectileEffect(ev.effectNo)?String(ev.effectNo):'';
  const projectileCode = thresholdProjectileCode || fxProjectileCode || ((!shownElsewhere && amount > 0 && vfxSource
    && typeof _effectPresentationCode === 'function' && typeof presentIsProjectileEffect === 'function'
    && typeof playProjectileEffectVfx === 'function')
    ? (presentIsProjectileEffect(_effectPresentationCode(vfxSource)) ? String(_effectPresentationCode(vfxSource)) : '')
    : '');
  const projectileSource = thresholdProjectileCode || fxProjectileCode ? source : vfxSource;
  if (projectileCode) {
    const repeat=presentEffectRun(api.events,api.eventIndex,`projectile:${projectileSource.id}:${projectileCode}`).repeat;
    const srcSide = projectileSource.side === 'p2' ? 'enemy' : 'ally';
    if (typeof getEffectSfxKey === 'function' && typeof playSfx === 'function') {
      const key = getEffectSfxKey(projectileCode);
      if (key) playSfx(key, { group: 'magic', guardKey: `projectile:${key}:${Date.now()}`, guardMs: 0 });
    }
    // 攻撃者のモーションを再開する前に着弾・HP反映まで完了させる。
    // 投げっぱなしにすると、ケンタウロスの攻撃効果だけが敵への着弾前に
    // 通常攻撃へ進み、2つのダメージ表示が重なる。
    let damageShown;
    const impact=new Promise(resolve=>{damageShown=resolve;});
    const flight=Promise.resolve(playProjectileEffectVfx(projectileSource, srcSide, target, fxSide, projectileCode, {
      amount,
      flightMs:repeat?presentEffectRunDuration(true)/(typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1):undefined,
      onImpact: () => {
        presentDamageImpact(ev);
        if (damagesHp && typeof api.applyHp === 'function') api.applyHp(target, ev.hpAfter);
        if (damagesHp && typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
      },
      onDamageShown:damageShown,
    })).catch(err => console.error('[projectile damage vfx]', err));
    await Promise.race([impact,flight]);
    return true;
  }
  // 数値を出す瞬間に、画面に出すHPもここまで進める。
  // ATKへのダメージは直前のstat_changeがATK表示を進める。逃走する体の
  // damage.hpAfterは盤面から外すための0であり、HP被弾の表示値ではない。
  // ここでHP0へ進めると、PvEだけ最終状態の体と合わさって退場前の
  // 描画で死亡体のように扱われる。
  if (damagesHp) {
    if (typeof api.applyHp === 'function') api.applyHp(target, ev.hpAfter);
    if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
  }
  if (!labHandled && ev.effect && source && typeof api.onEffectDamage === 'function') api.onEffectDamage(ev, source);
  // 固有SEもVFXと同じ規則で選ぶ。カード自身の効果文がダメージに触れていない場合は
  // 鳴らさない（強化カードで得た効果で本人のSEが鳴るのを防ぐ）。
  // 固有SEは被弾位置の固有VFXと同時に鳴らす（playHitVfx の effectSfx。2026-10-15）。
  // 数値を別経路（薙ぎ払い）で出し済みの時だけ、従来どおり後でまとめて鳴らす。
  if (vfxSource && shownElsewhere && typeof api.noteEffectSource === 'function') api.noteEffectSource(vfxSource);
  // 別経路（薙ぎ払い）で数値を出し済みなら、ここでは出し直さない。
  if (shownElsewhere) return true;
  if (amount <= 0) return true;
  // **ひとまとまりの命中音は同時に鳴らす。** 攻撃と反撃のように続けて起きる命中を
  // 1件ずつ鳴らすと、間に挟まるVFXの画像デコードで音がずれて聞こえる。
  if (!labHandled && !ev.suppressAttackHitSfx && api.sfxDone && !api.sfxDone.has(ev) && typeof playAttackDamageSfx === 'function') {
    const batch = typeof api.sfxBatch === 'function' ? (api.sfxBatch(ev) || []) : [ev];
    // **同じ音は同じ瞬間に1本しか鳴らさない。**
    // 同じ命中音を人数分だけ重ねると、play()の鳴り始めが1本ごとにばらつくうえ、
    // 暖機済みの複製を使い切った分は読み込みからやり直しになり、確実にずれて聞こえる。
    // （全体攻撃・攻撃と反撃・薙ぎ払いなど、同種の命中が重なる場面はどれもこれに当たる）
    const playedKeys = new Set();
    batch.forEach(d => {
      if (!d || api.sfxDone.has(d)) return;
      api.sfxDone.add(d);
      if (presentLabEventHandled(d)) return;
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
    presentDamageImpact(ev);
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
      ...(labHandled ? {labelOnly:true,keywordSfx:false} : {}),
      ...(vfxSource ? { effectSource: vfxSource, effectSfx: !labHandled } : {}),
      ...(labelMs > 0 ? { labelDuration: labelMs, labelDurationMin: 0 } : {}),
      keywordEffect: ev.keywordEffect || undefined,
      // 状態異常を付けたダメージは、そのキーワードの絵で見せる（音は変えない）。
      vfxKeyword: (!labHandled && typeof api.vfxKeyword === 'function' ? api.vfxKeyword(ev) : '') || undefined,
      // 効果が当たった瞬間の専用演出（炎の矢＝E058_2）。素材が無ければ通常の被弾VFX。
      // 素材はシートの「VFX/SE」列で引く（指定が無ければ効果のカードNo.のまま）。
      effectHitCode: (!labHandled && (typeof api.effectFxCode === 'function'
        ? api.effectFxCode(ev.effectNo) : ev.effectNo)) || undefined,
      // ATKへのダメージ（武器破壊）は被弾の絵を出さず、数値の上に小さく「ATK」と出す。
      // HPは減らないので、被弾VFXを出すと「HPを削った」ように見える。
      ...(ev.damageTo === 'atk' ? { labelOnly: true, labelNote: 'ATK' } : {}),
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
// api: findUnit(side,id) / render() …
function presentShieldLostEvent(ev, api) {
  if (!ev || !api) return false;
  if (_presentContactHits.has(ev)) return true;
  const unit = api.findUnit(ev.side, ev.unitId);
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  if (unit) {
    if (typeof battleFxRect === 'function') _presentLabOrigins.shield.set(ev.side,{unit,rect:battleFxRect(unit,fxSide,ev.lastVisualRect)});
    // 結界の状態表示を進めるのはこの瞬間（防御の命中と同じ時刻）。
    // 残りの結界は**イベントに書かれた値**を使う。コアは手番を先に解決し終えているので、
    // 実体（unit.shield）はこの先の分まで減っていることがあり、
    // またオンラインの受け口はイベントでしか実体を更新できない。
    const nextShield = Number.isFinite(Number(ev.shield))
      ? Math.max(0, Number(ev.shield)) : Math.max(0, Number(unit.shield) || 0);
    if (typeof api.applyShield === 'function') api.applyShield(unit, nextShield);
    if (typeof presentAdvanceShown === 'function') presentAdvanceShown(unit, { shield: nextShield });
    if (typeof battleFxAdvanceStates === 'function') battleFxAdvanceStates(unit,{shield:nextShield});
    if (typeof updateUnitShieldUi === 'function') updateUnitShieldUi(unit, fxSide);
    // 結界の音は防いだ瞬間に残す。消失の絵はLABだけにし、死亡などの後続は待たせない。
    const sound = typeof getKeywordEffectSfxKey === 'function' ? getKeywordEffectSfxKey('結界') : '';
    if (sound && typeof playSfx === 'function') playSfx(sound,{group:'combat',guardMs:0});
    // 割れる瞬間（全尺の30%）は接触の直後に出す。ひびの溜め（0〜30%）は戦闘では飛ばし、割れる直前（26%）から始める
    // （2026-10-20 利用者指摘：攻撃したカードが元の位置へ戻ってから割れて見えた）。
    if (nextShield===0 && typeof playBattleLabFx === 'function') void playBattleLabFx('shield_break',unit,[unit],{side:fxSide,seekRatio:.26});
  }
  // 結界のエフェクトを消すため、盤面も描き直す。
  if (typeof api.render === 'function') api.render();
  return !!unit;
}

// PvE・オンライン・保存再生とも、接触フックから同じイベント受け口を呼ぶ。
// VFXの終了を待たず、表示済みのイベントは後続ループで二重に出さない。
const _presentFirstStrikes = new WeakMap();
async function presentAttackContactHits(events, index, api) {
  const pending=_presentLabContacts.get(events[index])||[];
  pending.forEach(_presentLabStart);
  const first=_presentFirstStrikes.get(events[index]);
  if(first&&typeof playBattleLabFx==='function'){
    _presentFirstStrikes.delete(events[index]);
    Promise.resolve(playBattleLabFx(getKeywordAssetKey('先制'),first.attacker,[first.target],{side:first.attacker.side==='p2'?'enemy':'ally'})).catch(()=>{});
  }
  for (const ev of presentAttackContactHitEvents(events,index)) {
    if (_presentContactHits.has(ev)) continue;
    const shown = ev.type==='shield_lost' ? presentShieldLostEvent(ev,api.shield) : await api.damage(ev);
    if (shown) _presentContactHits.add(ev);
  }
  for(const plan of pending){await _presentLabFinish(plan);if(plan.manaGain){_presentLabManaAfter(plan,plan.manaGain.unit,plan.manaGain.side);await plan.after;}}
  _presentLabContacts.delete(events[index]);
}

// ── 能力変化（バフ・負傷効果など）────────────────────
// api:
//   findUnit(side,id) / findAnyUnit(id)
//   applyStats(unit, ev)  … 画面に出すATK/HPをここまで進める（PvEは据え置き値、
//                            オンラインは実体そのもの）。
//                            **hpの増減は既定でmaxHpにも効く。**
//                            `ev.maxHp` が入っている場合だけ、そちらをmaxHpの増減として使う
//                            （毒＝HPだけ減って最大HPは変わらない）。
//   cueKeys               … 固有SEを鳴らし終えた「発生元＋効果」の記録（Set）
//   vfxGate               … 固有VFXを出し終えた「発生元＋効果＋対象」のゲート
//   render()              … 盤面の描き直し（不要なら省略）
//   trace(info)           … 記録（不要なら省略）
async function presentStatChangeEvent(ev, api) {
  if (!ev || !api) return false;
  if (_presentStatChangesShown.has(ev)) return true;
  // 固有VFXが命中時刻を管理する変化は、そのイベントの着弾を待つ。
  const members = (presentLabEventHandled(ev) ? [ev]
    : presentManaStatChangeEvents(ev,api.events,api.eventIndex).filter(e => !presentLabEventHandled(e)))
    .filter(e => !_presentStatChangesShown.has(e));
  const vfx = new Map();
  const groupedApi = { ...api, render: null, playVfx: (code, target, options) => {
    const key = `${code}:${options.hitDuration}`;
    if (!vfx.has(key)) vfx.set(key, { code, targets: [], options });
    vfx.get(key).targets.push(target);
  } };
  // 数値は全員ぶん先に同じ瞬間へ進め、VFX入口のgateも束につき1回だけ待つ。
  members.forEach(e => _presentStatChangesShown.add(e));
  const shown = members.map(e => _presentStatChangeEvent(e,groupedApi));
  await Promise.all([...vfx.values()].map(v => _playCardEffectVfx(v.code,v.targets,v.options)));
  if (typeof api.render === 'function') api.render();
  return shown.some(Boolean);
}
function _presentStatChangeEvent(ev, api) {
  if (!ev || !api) return false;
  const target = api.findUnit(ev.side, ev.unitId);
  if (!target) return false;
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  // **効果の発光（負傷＝赤など）は、能力変化を見せるこの瞬間に始める。** 発光は次のVFXまで保留する仕組みだが、
  // グレムリンの「全ての敵はATK-1」のように同期の入口を通るVFXが無い効果では、安全弁の700ms後まで光らず遅れて見えた。
  if (typeof presentFlushEffectFlashes === 'function') presentFlushEffectFlashes();
  // 変化を見せる瞬間に、画面に出すATK/HPもここまで進める。
  if (typeof api.applyStats === 'function') api.applyStats(target, ev);
  if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
  const source = ev.sourceId != null && typeof api.findAnyUnit === 'function'
    ? api.findAnyUnit(ev.sourceId) : null;
  // どの理由で固有VFXを出すかは present.js が唯一の実装。
  if (!presentLabEventHandled(ev) && source && typeof presentStatChangeVfxAllowed === 'function' && presentStatChangeVfxAllowed(ev)
    && typeof _playCardEffectVfx === 'function' && typeof _effectPresentationCode === 'function') {
    // 攻撃時のバフは一律の演出（S005）。それ以外は発生元カードの番号。規則は present.js。
    const ownCode = String(_effectPresentationCode(source) || '');
    // シートの「VFX/SE」列は複数書けるので、全部渡してトリガで選ばせる。
    // 強化カードの効果は、その強化カードのVFX/SE列を優先する。
    const codes = typeof _effectPresentationCodes === 'function' ? _effectPresentationCodes(source) : [ownCode];
    const enchantName = typeof presentStatChangeEnchantName === 'function'
      ? presentStatChangeEnchantName(ev.reason) : '';
    const enchantCode = enchantName && typeof _enchantFxCode === 'function' ? _enchantFxCode(enchantName) : '';
    const ownEffectText = typeof api.ownEffectText === 'function' ? api.ownEffectText(source) : '';
    const ownHasArt = typeof getCharacterEffectVfxPath === 'function' ? !!getCharacterEffectVfxPath({ fxCode: ownCode }) : true;
    const code = typeof presentStatChangeVfxCode === 'function'
      ? presentStatChangeVfxCode(ev, ownCode, { codes, enchantCode, ownEffectText, ownHasArt, fromEnchant: !!enchantName,
        enchantText: enchantName && typeof PANEL_POOL !== 'undefined' ? String((PANEL_POOL.find(p => p && String(p.name || '').trim() === enchantName) || {}).desc || '') : '' }) : ownCode;
    if (/^[A-Z]{1,2}\d{3}$/i.test(code)) {
      const run=presentStatChangeRun(ev,api.events,api.eventIndex);
      const cueKey = run.key;
      const duration=presentEffectRunDuration(run.repeat,typeof PRESENT_CARD_EFFECT_VFX_MS==='number'?PRESENT_CARD_EFFECT_VFX_MS:700);
      // 固有SEは効果1回につき1回。VFXは対象ごとに1回。重複の単位を分ける。
      if (api.cueKeys && !api.cueKeys.has(cueKey)) {
        api.cueKeys.add(cueKey);
        if (typeof api.trace === 'function') {
          api.trace({ sourceId: source.id, targetId: target.id, reason: String(ev.reason || ''), code: code.toUpperCase() });
        }
        // マナの合図が同じ音声を既に鳴らしていれば重ねない（素材キーの別名も含む）。
        const mana = presentManaWaveInfo(api.events,api.eventIndex);
        const manaCode = mana && typeof _effectFxCodeByNo === 'function' ? _effectFxCodeByNo(mana.threshold.effectNo) : '';
        const pulsed = mana && mana.group.stats.includes(ev) && !presentIsBuffVfxCode(manaCode) && !presentLabFx(manaCode)
          && typeof getEffectSfxKey === 'function' && getEffectSfxKey(manaCode)
          && typeof Assets !== 'undefined' && Assets.sfx && Assets.sfx[manaCode] === Assets.sfx[code.toUpperCase()];
        // SEのピークをVFXの山場へ合わせる（2026-10-15）。尺は下のVFXと同じ PRESENT_CARD_EFFECT_VFX_MS。
        if (!pulsed) {
          if (typeof _playCardEffectSfxAtCue === 'function') _playCardEffectSfxAtCue(code.toUpperCase(), duration);
          else if (typeof _playCardEffectSfx === 'function') _playCardEffectSfx(code.toUpperCase());
        }
      }
      // 全員ぶんを束へ積み、共通入口でVFXを同時に開始してから待つ。
      if (api.vfxGate && api.vfxGate.shouldPlay(`${cueKey}:${target.id}`)) {
        // 尺は present.js が唯一の定義（ゴーレムの負傷エフェクトと同じ長さ）。
        api.playVfx(code, target, { gateMs: 0,
          hitDuration: duration });
      }
    }
  }
  if (typeof api.render === 'function') api.render();
  return true;
}

// ── ラン効果（報酬とトレーダーの強化・リロール・接続エンチャントの強化）────────
// 演出の番号は present.js presentRunEffectVfxCode が唯一の規則。尺・SEは能力変化の固有VFXと同じ。
// api: findUnit(side,id)
async function presentRunEffectEvent(ev, api) {
  if (!ev || !api) return false;
  const code = typeof presentRunEffectVfxCode === 'function' ? presentRunEffectVfxCode(ev) : '';
  const unit = code ? api.findUnit(ev.side, ev.unitId) : null;
  if (!unit || typeof _playCardEffectVfx !== 'function') return false;
  if (typeof presentFlushEffectFlashes === 'function') presentFlushEffectFlashes();
  const base = typeof PRESENT_CARD_EFFECT_VFX_MS === 'number' ? PRESENT_CARD_EFFECT_VFX_MS : 700;
  const duration = typeof presentRunEffectVfxMs === 'function' ? presentRunEffectVfxMs(code, base) : base;
  if (typeof _playCardEffectSfxAtCue === 'function') _playCardEffectSfxAtCue(code, duration);
  // 負傷のバフ演出（S006）を同じ瞬間に重ねる（報酬への祝福はカードの上辺から昇るだけで、中央を覆わない）。
  const companion = typeof presentRunEffectCompanionVfxCode === 'function' ? presentRunEffectCompanionVfxCode(ev) : '';
  if (companion && typeof _playCardEffectSfxAtCue === 'function') _playCardEffectSfxAtCue(companion, base);
  await Promise.all([_playCardEffectVfx(code, [unit], { gateMs: 0, hitDuration: duration }),
    companion ? _playCardEffectVfx(companion, [unit], { gateMs: 0, hitDuration: base }) : null,
    code === 'E016' ? _presentTransformResultCover(ev, api, unit, duration).catch(() => {}) : null]);
  return true;
}
// 変化（E016）：変身の霧の山場で、変化後の姿（変身先の味方のカード）を本人の枠に重ねて見せる（2026-10-27 利用者指定）。
// 写しは見た目を固めた複製（_activationCaptureVisual）。盤面の描き直しで枠ごと消える。
const PRESENT_TRANSFORM_COVER_FADE_MS = 320, PRESENT_TRANSFORM_COVER_HOLD_MS = 900;
async function _presentTransformResultCover(ev, api, unit, duration) {
  const from = ev.fromUnitId != null ? api.findUnit(ev.side, ev.fromUnitId) : null;
  const side = ev.side === 'p2' ? 'enemy' : 'ally';
  const slot = typeof getCurrentUnitSlot === 'function' ? getCurrentUnitSlot(side, unit) : null;
  const fromSlot = from && typeof getCurrentUnitSlot === 'function' ? getCurrentUnitSlot(side, from) : null;
  const shot = fromSlot && typeof fromSlot.cloneNode === 'function' && typeof _activationCaptureVisual === 'function' ? _activationCaptureVisual(fromSlot) : null;
  if (!slot || !shot) return;
  const spec = typeof presentLabFx === 'function' ? presentLabFx('E016') : null;
  const wait = ms => new Promise(resolve => (typeof battlePresentationSetTimeout === 'function' ? battlePresentationSetTimeout : setTimeout)(resolve, ms));
  await wait(duration * (spec ? Number(spec[1]) || .58 : .58));
  if (!slot.isConnected) return;
  const node = shot.node;
  node.classList.remove('slot');
  [node, ...node.querySelectorAll('[data-unit-id],[data-unit-idx]')].forEach(n => { n.removeAttribute('data-unit-id'); n.removeAttribute('data-unit-idx'); });
  node.style.setProperty('z-index', '92', 'important');
  node.style.setProperty('pointer-events', 'none', 'important');
  // 枠の中の座標なので、変身先の枠の大きさを本人の枠の大きさへ合わせるだけでよい。
  node.style.setProperty('transform', `scale(${(slot.offsetWidth || shot.width) / shot.width},${(slot.offsetHeight || shot.height) / shot.height})`, 'important');
  node.style.setProperty('opacity', '0', 'important');
  slot.appendChild(node);
  const fade = node.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: PRESENT_TRANSFORM_COVER_FADE_MS, easing: 'ease-out', fill: 'forwards' });
  if (fade) await fade.finished.catch(() => {}); else node.style.setProperty('opacity', '1', 'important');
  await wait(PRESENT_TRANSFORM_COVER_HOLD_MS);
}

// 2026-10-12 利用者指定: キーワードの意味は名前で引き、既存素材キーは共通対応表で解決する。
// ── キーワードの付与（毒・弱体など）──────────────────────
// **状態異常を受けた瞬間**の見せ方。キーワード専用のVFXとSEを対象の上に出す
// （毒牙で毒を受けたの既存素材）。素材は名前（`getKeywordAssetKey`）で引くので、
// **ここにカード名や番号を直接書かないこと。**
// 素材が登録されていないキーワードでは何も出さない
// （通常の被弾VFXへ落とすと「殴られた」ように見える）。
// api: findUnit(side,id)
function presentKeywordEffectEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  // 結界を得た瞬間に状態表示・結界バッジを進める。
  // 盤面の描き直しは次の攻撃などまで来ないため、ここで出さないと
  // 結界を得たのに絵が出ないままになる（スプリガンのマナ効果）。
  // 表示そのものの実装は render.js の updateUnitShieldUi が唯一の置き場。
  if (String(ev.effect || '') === 'shield') {
    const prior=typeof battleFxStoredStateValues==='function'?battleFxStoredStateValues(unit):null;
    if (typeof presentAdvanceShown === 'function') presentAdvanceShown(unit, { shield: prior?prior.shield+(Number(ev.amount)||0):unit.shield });
    if (typeof updateUnitShieldUi === 'function') updateUnitShieldUi(unit, fxSide);
  }
  // 弱体を与えた瞬間に、据え置いていた弱体の値を進める（ホバー説明の「弱体N」がここで増える）。
  if (String(ev.effect || '') === 'weaken' && unit._displayWeaken != null && typeof presentAdvanceShown === 'function') {
    const prior=typeof battleFxStoredStateValues==='function'?battleFxStoredStateValues(unit):null;
    presentAdvanceShown(unit, { weaken: prior ? prior.weaken+(Number(ev.amount)||0)
      : Math.min(Math.max(0, Number(unit.weaken) || 0),unit._displayWeaken+Math.max(0,Number(ev.amount)||0)) });
  }
  // **ホバー説明もこの瞬間に作り直す**（弱体・毒などは盤面を描き直すまで説明に出なかった）。
  if (typeof refreshUnitPreviewUi === 'function') refreshUnitPreviewUi(unit, fxSide);
  const keyword = String(ev.keyword || PRESENT_KEYWORD_EFFECT_NAMES[String(ev.effect || '')] || '');
  if (!keyword) return false;
  // 「復活」の絵は**実際に復活した瞬間**の演出。復活を得ただけ（ヴリコラカス）では出さない（利用者指定）。
  if (String(ev.effect || '') === 'keyword_gain' && keyword === '復活') return false;
  if (['weaken','shield'].includes(String(ev.effect || '')) || presentLabEventHandled(ev)) return true;
  if (typeof getKeywordEffectVfxPath !== 'function' || !getKeywordEffectVfxPath(keyword)) return false;
  // **同じキャラクターへ続けて付与される間は出し直さない**（バフVFXと同じ見せ方）。
  // 1つの再生を延ばして出し続ける。実装は render.js が唯一の置き場。
  if (typeof playKeywordEffectVfxSustained === 'function'
    && playKeywordEffectVfxSustained(unit, fxSide, keyword)) return true;
  if (typeof playHitVfx === 'function') playHitVfx(fxSide, unit, 0, { keywordEffect: keyword });
  return true;
}
// ── 即死 ────────────────────────────────────
// 即死効果を受けた瞬間、そのキャラクターの上にキーワード「即死」の演出（既存素材）を出す。
// **絵も音も名前から素材キーで引く**（`getKeywordAssetKey`）。素材が無ければ何も出さない。
function presentInstantDeathEvent(ev, api) {
  if (!ev || !api) return false;
  // 即死したカードは焼失ではなく、薄れながら四散させる（2026-10-27 利用者指定。render.js _playUnitDeathCardFx が見る印）。
  const unit = api.findUnit(ev.side, ev.unitId);
  if (unit) unit._deathByInstant = true;
  return presentKeywordEffectEvent({ side: ev.side, unitId: ev.unitId, keyword: '即死' }, api);
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
// コアと同じ配置へ、今このイベントで見えているHPを渡す。
// PvEの最終HPを使うと、接触で倒れる右端の体を飛ばして召喚体が左へ入り込む。
// 配置用の写しだけをコアへ渡し、盤面には元の参照を戻す（HPの実値は変えない）。
function presentInsertSummonedUnit(list, unit, spec, frontSlots) {
  const originals = new Map();
  const view = u => {
    if (!u) return null;
    const copy = {...u,hp:typeof presentShownHp==='function'?presentShownHp(u):u.hp};
    originals.set(copy,u); return copy;
  };
  const shown = list.map(view), child = view(unit);
  const at = coreInsertSummonedUnit(shown,child,spec,frontSlots);
  unit.lane = child.lane;
  list.splice(0,list.length,...shown.map(u=>originals.get(u)));
  return at;
}

// api: list(side) / hasUnit(list,id) / place(list,unit,spec) / hasDom(unit,side) / compact(force) / render()
// placeは presentInsertSummonedUnit を通し、位置決めをコアへ委ねる。
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
    _presentPendingFlashTimer = typeof battlePresentationSetTimeout === 'function'
      ? battlePresentationSetTimeout(() => {
        _presentPendingFlashTimer = null;
        presentFlushEffectFlashes();
      }, PRESENT_EFFECT_FLASH_MAX_WAIT_MS)
      : setTimeout(() => {
      _presentPendingFlashTimer = null;
      presentFlushEffectFlashes();
      }, PRESENT_EFFECT_FLASH_MAX_WAIT_MS);
  }
  return true;
}
// 保留していた発光をまとめて始める。**完了は待たない**（待つと人数ぶん直列化して明滅がずれる）。
function presentFlushEffectFlashes() {
  if (!_presentPendingFlashes.length) return false;
  // **倒れた体では光らせない（死亡効果だけは別）。** 発光は貯めてからまとめて出すので、
  // 貯めている間に死んだ体の分がそのまま死亡の瞬間に出てしまう
  // （負傷効果は死亡時には発動しないので、光ってはいけない）。
  // **死亡効果（青）は倒れた体で光るのが正しい。** ここでも弾くと青が一切出ない。
  const list = _presentPendingFlashes.filter(f => f && (f.onDeath || !(f.unit && Number(f.unit.hp) <= 0)));
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
  presentResetLabEvents();
  if (typeof stopBattleLabFx === 'function') stopBattleLabFx();
  if (typeof resumeBattleLabStates === 'function') resumeBattleLabStates();
  if (typeof actionBannerClear === 'function') actionBannerClear();
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
  // **死亡効果の発光だけは倒れた体で出す。** 死亡効果は必ずHP0で発動するので、
  // 生存判定で弾くと青い発光が一切出なくなる。
  const onDeath = String(ev.trigger || '') === 'death';
  // **倒れた体では光らせない。**（負傷効果は死亡時には発動しない）
  if (!onDeath && Number(unit.hp) <= 0) return false;
  // 発光の色。**ここが唯一の定義。**
  //   解放（release）＝紫／開戦・終戦・常時の誘発（passive）＝白
  // 「常時：緑のキャラクターから得るマナは+1される」のような**受動的な補正**は
  // コアがイベントを出さないので、そもそも光らない。
  //   援護射撃（support_fire）＝赤（利用者指定。発動元と実際に撃った味方を光らせる）
  const colors = { attack: 'yellow', injury: 'red', death: 'blue', mana: 'green',
    opening: 'white', battle_end: 'white', passive: 'white', release: 'purple',
    support_fire: 'red' };
  const color = colors[String(ev.trigger || '')];
  if (!color) return false;
  // 発光は同じタイミングの複数イベントを同時に開始する。ここをawaitすると、
  // キャラクター数ぶん直列化されて明滅がずれる。
  presentQueueEffectFlash({ unit, side: ev.side === 'p2' ? 'enemy' : 'ally', color, count: ev.count, onDeath });
  return true;
}

// 攻撃を見せた記録は自動加速の共通条件で使う。PvEのイベント生成側と
// オンラインのイベント受け口の両方からこの関数を通し、片側だけ記録しない。
function presentRecordAttackEvent(ev) {
  if (ev && ev.immediate && typeof actionBannerStartScope === 'function') actionBannerStartScope();
  if (!ev || ev.attackerId == null || typeof G === 'undefined' || !G) return;
  if (!G._battleAttackedIds) G._battleAttackedIds = {};
  G._battleAttackedIds[ev.attackerId] = true;
}

// ゴールド獲得の見せ方と、表示上の所持金を確定する時刻を共通化する。
// api:
//   findUnit(side,id) / findAnyUnit(id)
//   getVisualRect(ev, source) … 死亡後の発生元を描くための最後の矩形
//   applyGold(amount, ev) … 逆再生開始時（または安全弁）に表示値へ反映
//   updateHud() / trace(info) … 任意
async function presentGoldGainEvent(ev, api) {
  if (!ev || !api) return false;
  const amount = Math.max(0, Number(ev.amount) || 0);
  if (!(amount > 0)) return false;
  const live = ev.unitId != null && typeof api.findUnit === 'function'
    ? api.findUnit(ev.side, ev.unitId) : null;
  const source = live || (ev.unit ? { ...ev.unit } : null);
  if (!source) {
    if (typeof api.applyGold === 'function') api.applyGold(amount, ev);
    if (typeof api.updateHud === 'function') api.updateHud();
    return false;
  }
  const rect = typeof api.getVisualRect === 'function' ? api.getVisualRect(ev, source) : null;
  if (rect && rect.width > 0 && rect.height > 0) source._lastVisualRect = { ...rect };
  const own = typeof _effectPresentationCode === 'function'
    ? String(_effectPresentationCode(source) || '').toUpperCase() : '';
  const hasOwnVfx = own && typeof getCharacterEffectVfxPath === 'function'
    && getCharacterEffectVfxPath({ fxCode: own });
  // 固有の演出が無いカード（遺産などの強化から得たゴールド）は、汎用の金貨（S003）を出す。
  // 以前は何も出ずに所持金だけが増えていた（2026-10-17）。
  const code = hasOwnVfx ? own : 'S003';
  const hasSfx = code && typeof getEffectSfxKey === 'function' && getEffectSfxKey(code);
  const hasVfx = code && typeof getCharacterEffectVfxPath === 'function'
    && getCharacterEffectVfxPath({ fxCode: code });
  if (typeof api.trace === 'function') api.trace({ unitId: ev.unitId, amount, code });
  if (hasSfx && typeof _playCardEffectSfx === 'function') _playCardEffectSfx(code);

  let applied = false;
  const apply = () => {
    if (applied) return;
    applied = true;
    if (typeof api.applyGold === 'function') api.applyGold(amount, ev);
    if (typeof api.updateHud === 'function') api.updateHud();
  };
  let reverseStart = Promise.resolve();
  if (hasVfx && typeof _playCardEffectVfx === 'function') {
    reverseStart = new Promise(resolve => {
      const done = () => { apply(); resolve(); };
      Promise.resolve(_playCardEffectVfx(code, [source], {
        gateMs: 0, hitDuration: 900, waitForFinish: false,
        onFadeStart: done,
      })).catch(() => {}).then(() => { if (!applied) resolve(); });
    });
  }
  // DOM矩形を取れない環境でも、所持金の表示だけは必ず進める。
  await Promise.race([reverseStart, new Promise(resolve => setTimeout(resolve, 1100))]);
  apply();
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
    const sfx=mode==='all'?'':(typeof getAttackContactSfxKey==='function'?getAttackContactSfxKey(mode):'');
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
  // 表示用の体にはコアのキーワード結果を反映する。コアと体を共有するPvEは書き戻さない。
  // 眷属の除去を再生側で判断せず、後続の変身・付与まで計算済みの最終状態を巻き戻さない。
  if (unit0 && Array.isArray(ev.keywords) && typeof api.applyKeywords === 'function') {
    api.applyKeywords(unit0, ev.keywords);
  }
  // **画面に出すATK/HPを、蘇生後の値まで進める。**（復活・根性・指輪すべて）
  // ダメージで0まで進めた表示をそのままにすると、根性で耐えたのに
  // 戦闘終了時のHPが0のまま残る。
  if (unit0 && typeof api.applyStats === 'function') api.applyStats(unit0, ev);
  // 2026-10-25 利用者指定：復活の指輪で蘇った時は専用の演出（revival-ring。assets.js の R018）を蘇った体の上に出す。
  if (String(ev.reason || '') === 'revival_ring' && unit0 && typeof _playCardEffectVfx === 'function') {
    if (typeof api.render === 'function') api.render();
    const duration = typeof presentRunEffectVfxMs === 'function' ? presentRunEffectVfxMs('R018', 1000) : 1000;
    await _playCardEffectVfx('R018', [unit0], { gateMs: 0, hitDuration: duration });
    return true;
  }
  // 専用の演出があるのはキーワード「復活」と復活の指輪だけ（根性は演出なし）。
  if (String(ev.reason || '') !== '復活') return false;
  const unit = unit0;
  if (!unit || typeof playReviveVfx !== 'function') return false;
  // 同じ多段攻撃中に「死亡→復活→再び死亡」する場合、1回目の死亡演出の印を
  // 残すと復活後のカードを描き直せず、VFXだけが空枠へ出る。復活は新しい生存期間の開始。
  delete unit._deathFxStarted;
  delete unit._deathFxReady;
  delete unit._deathFxDone;
  // **描画より先に隠す。** ここで render() すると復活した体が一度そのまま出てしまい、
  // playReviveVfx() が隠すまでの間だけカードが見えて「出る→消える→VFX→また出る」になる。
  // 印は render.js の renderField() が見て `.revive-hidden` を付ける。
  unit._reviveHidden = true;
  if (typeof api.render === 'function') api.render();
  await playReviveVfx(unit, ev.side === 'p2' ? 'enemy' : 'ally');
  return true;
}

// ── マナ効果（Nマナ毎の発動）────────────────────────
// **発動回数ぶん見せる。間引かない。** 「Xマナ毎」が到達回数ぶん発動したとき、
// 2回目以降を捨てていたため、5回発動しても演出・SEは1回きりで、
// ATK/HPも一息に+5/+5されたように見えた（活性化×5で発覚）。
// マナ効果VFX（既存素材）は**ひと続きにつき、その効果の最初の1回だけ**。
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
// api: findUnit(side,id) / gate / waveGate / waveEvents(ev) /
//      playCue(units[{unit,isEnemySide,targets}], { repeat, effectNo })
async function presentManaThresholdEvent(ev, api) {
  if (!ev || !api) return false;
  const source = api.findUnit(ev.side, ev.unitId);
  // 発光はマナ効果VFXが出る瞬間に合わせる（ここで光らせると、前の効果の演出を
  // 待っている間ずっと光ったままになり、絵より大きく先行して見える）。
  // 飛び道具はdamageイベントで一発ずつ着弾まで待つ。その直後の数値・キーワードを
  // 処理し終えてから次へ進むため、同じwaveの将来の矢をここで先に飛ばさない。
  if(typeof presentIsProjectileEffect==='function'&&presentIsProjectileEffect(ev.effectNo)) {
    if (source) presentQueueEffectFlash({ unit: source, side: ev.side === 'p2' ? 'enemy' : 'ally', color: 'green', count: 1 });
    return true;
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
  // 同じ体のマナ効果の合図は1つにまとめる。ダメージは後続イベントが個別に見せる。
  const byUnit = new Map();
  wave.forEach(e => {
    const key = `${e.side}:${e.unitId}`;
    const unit = api.findUnit(e.side, e.unitId);
    if (!unit) return;
    if (!byUnit.has(key)) byUnit.set(key, { unit, isEnemySide: e.side === 'p2', targets: [] });
  });
  const units = [...byUnit.values()];
  if (!units.length && source) units.push({ unit: source, isEnemySide: ev.side === 'p2', targets: [] });
  // 発光も全員を一緒に予約する。2体目以降で予約し直すと、合図から遅れて光る。
  units.forEach(({unit,isEnemySide}) => presentQueueEffectFlash({unit,side:isEnemySide?'enemy':'ally',color:'green',count:1}));
  if (typeof api.playCue === 'function') {
    const actionBannerWave = typeof actionBannerBeginManaWave === 'function' ? actionBannerBeginManaWave(wave) : null;
    try { await api.playCue(units, { repeat, effectNo: String(ev.effectNo || '') }); }
    finally { if (typeof actionBannerEndManaWave === 'function') actionBannerEndManaWave(actionBannerWave); }
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
// **同じ瞬間に倒れた体は、まとめて1回で見せる。**
// どこまでが「同じ瞬間」かは present.js の presentDeathBatchEvents が唯一の実装。
// api:
//   findUnit(side,id)        … 盤面からユニットを引く
//   isDone(ev) / markDone(ev)… 二重演出を防ぐ記録
//   beat()                   … 直前の数値を読ませる間（**まとめて1回だけ待つ**）
//   startFx(unit, side)      … カードの消失演出を始める（省略可。PvEのみ）
//   processDeath(unit, side) … 陣営ごとの後始末（省略可。PvEのみ）
//   compact()                … 盤面の詰め（省略可。**まとめて1回だけ**）
// 死亡効果の発光を見せてから焼き落とすまでの間（ms）。
const PRESENT_DEATH_FLASH_HOLD_MS = 220;

// 決着台詞の順序と、台詞中に次の演出へ進まないことの唯一の実装。
// api.showLines(unit, side, lines, {kind}) だけが DOM 側の吹き出しを担当する。
async function _presentOutcomeLineEntries(entries, kind, api) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length || !api || typeof api.showLines !== 'function') return false;
  let shown = false;
  for (const entry of list) {
    const ev = entry && entry.ev;
    const unit = entry && entry.unit;
    if (!unit) continue;
    if (ev && typeof api.isLineDone === 'function' && api.isLineDone(ev)) continue;
    const lines = typeof presentUnitOutcomeLines === 'function'
      ? presentUnitOutcomeLines(unit, kind) : [];
    if (!lines.length) continue;
    if (ev && typeof api.markLineDone === 'function') api.markLineDone(ev);
    shown = true;
    await api.showLines(unit, entry.side || (ev && ev.side) || '', lines, { kind });
  }
  return shown;
}

async function presentOutcomeEventLines(evs, kind, api) {
  const list = (Array.isArray(evs) ? evs : [evs]).filter(Boolean);
  if (!api || typeof api.findUnit !== 'function') return false;
  return _presentOutcomeLineEntries(list.map(ev => ({
    ev,
    side: ev.side,
    unit: api.findUnit(ev.side, ev.unitId),
  })), kind, api);
}

// キャラクターがぶつかった瞬間の停止。対応する死亡／逃走の選別は
// present.js の純粋関数、吹き出しの待機はこの共通入口が受け持つ。
async function presentAttackContactOutcomeLines(events, attackIndex, api) {
  const outcomes = typeof presentAttackContactOutcomeEvents === 'function'
    ? presentAttackContactOutcomeEvents(events, attackIndex) : [];
  let shown = false;
  for (const ev of outcomes) {
    const kind = ev.type === 'fled' ? 'flee' : 'death';
    if (await presentOutcomeEventLines([ev], kind, api)) shown = true;
  }
  return shown;
}

// 残った敵は呼び出し側が渡した盤面順に、1体ずつ1台詞ずつ話す。
async function presentPlayerDefeatLines(speakers, api) {
  const entries = (Array.isArray(speakers) ? speakers : []).map(entry => entry && entry.unit
    ? entry : { unit: entry, side: 'p2' });
  return _presentOutcomeLineEntries(entries, 'playerDefeat', api);
}

async function presentDeathBatch(evs, api) {
  const list = (Array.isArray(evs) ? evs : [evs]).filter(Boolean);
  if (!list.length || !api) return false;
  const entries = [];
  list.forEach(ev => {
    if (!ev.unitId) return;
    if (typeof api.isDone === 'function' && api.isDone(ev)) return;
    const unit = api.findUnit(ev.side, ev.unitId);
    if (!unit) return;
    // 2026-10-10：呪詛はdamage(hpAfter:0)を出さない。共通の死亡通知で表示HPだけを進める。
    if (ev.reason === 'curse' && typeof presentAdvanceShown === 'function') presentAdvanceShown(unit, { hp: 0 });
    // 既に生き返っている（根性など、画面でも倒れていない）場合はここでは演出しない。
    // **倒れたかは画面に出ているHPで見る。** PvEの体はコアの最終状態なので、倒れた後に「復活」で
    // 生き残った体は hp>0 のまま届く。最終値で見ていた頃は、PvEだけ焼失が出ずに復活の演出だけになっていた
    // （オンラインは1手ずつ進めるので焼失→復活。戦闘中に召喚されたスケルトンで食い違った。2026-09-29）。
    const shownHp = typeof presentShownHp === 'function' ? presentShownHp(unit) : Number(unit.hp);
    if (Number(shownHp) > 0) return;
    // 死亡の効果で自分が封印される体は盤面に残る。焼失を出さず、続く封印の付与で封印中の姿にする（present.js）。
    if (typeof presentDeathEndsSealed === 'function' && presentDeathEndsSealed(ev)) {
      if (typeof api.markDone === 'function') api.markDone(ev);
      unit._deathFxDone = true;
      return;
    }
    _presentRememberDeathOrigin(ev,unit);
    if (typeof api.markDone === 'function') api.markDone(ev);
    entries.push({ ev, unit });
  });
  if (!entries.length) return false;
  // 死亡演出を始める前に台詞が終わるまで停止する。
  await _presentOutcomeLineEntries(entries.map(entry => ({ ...entry, side: entry.ev.side })), 'death', api);
  // 直前に出した数値が読める間だけ待ってから消す。**待つのは全員ぶんで1回。**
  // この間、カードは**暗くせず**生きている見た目のまま残す（renderField 側）。
  // 暗くすると「死体が場に残っている」ように見え、待たないと数値が空白の上に残る。
  if (typeof api.beat === 'function') await api.beat();
  // **死亡効果の青い発光は、カードが焼き落ちる前に見せる。**
  // コアは死亡イベントの後に発光を出すため、present.js の並べ替えで前へ寄せてある。
  // ここで出さずに焼き落とすと、光らせる先のカードが既に盤面から消えている。
  if (typeof presentFlushEffectFlashes === 'function' && presentFlushEffectFlashes()) {
    if (typeof api.sleep === 'function') await api.sleep(PRESENT_DEATH_FLASH_HOLD_MS);
    else await new Promise(resolve => setTimeout(resolve, PRESENT_DEATH_FLASH_HOLD_MS));
  }
  // ここまでで数値・VFXは出し終えている。再生中でも焼き落としを始めてよい印。
  // **消失演出は同時に倒れた全員で同じ時点に始める。**
  // 先に1体の死亡効果を待つと、その間だけ他のカードが場に残り、
  // 「同時に倒れたのに1体ずつ消えていく」ように見える。
  entries.forEach(({ ev, unit }) => {
    // 死亡処理は通常と共通だが、戦闘修正で倒れた体の消失演出は
    // 従来どおり青い波打ち＋WASTED。deathイベントの印をこの共通入口で
    // 体へ渡すことで、PvEとオンラインが同じ規則で消える。
    if (ev.statChange) unit._deathByStatDrain = true;
    else delete unit._deathByStatDrain;
    unit._deathFxReady = true;
    if (typeof battleFxStopUnitStates === 'function') battleFxStopUnitStates(unit);
  });
  if (typeof api.startFx === 'function') entries.forEach(({ ev, unit }) => api.startFx(unit, ev.side));
  // **死亡効果の解決だけは発生順に行う。** 順序はコアが決めた通りで、ここでは変えない。
  for (const { ev, unit } of entries) {
    if (typeof api.processDeath === 'function') await api.processDeath(unit, ev.side);
  }
  // 詰めてよいが、**攻撃モーションの完了は待つ**。飛行中に盤面を詰めると、
  // 複製の戻り先が動いて元のカードが二重に見える。
  if (typeof api.compact === 'function') api.compact();
  return true;
}

async function presentDeathEvent(ev, api) {
  return presentDeathBatch([ev], api);
}

// ── 敵を奪う（移動）────────────────────────────────────
// **奪うのは移動。ワープさせない。**（利用者指定）
// 盤面を動かす前の位置から、動かした後の位置まで、攻撃モーションと同じ
// 「動く複製」で運ぶ。順番（複製を作る → 盤面を動かす → 運ぶ）は
// render.js の playUnitStealMotion() が持つ。ここは受け口の違いだけを渡す。
// api: findUnit(side,id) / moveOnBoard(unit,ev) / motion(unit,fromSide,toSide,applyBoard)
async function presentUnitStolenEvent(ev, api) {
  if (!ev || !api) return false;
  const toSide = ev.toSide || (ev.side === 'p1' ? 'p2' : 'p1');
  // PvEはコア解決済みで移動先配列にいる一方、オンラインは受け口が
  // moveOnBoard() まで元配列に保持する。どちらの時点でも同じ演出を使えるよう、
  // 元側・移動先側の順に探す（ルールや配置はここで作らない）。
  const unit = typeof api.findUnit === 'function'
    ? (api.findUnit(ev.side, ev.unitId) || api.findUnit(toSide, ev.unitId))
    : null;
  const applyBoard = () => {
    // 奪った時点の値（コアのスナップショット）へ表示を合わせる。
    // サキュバスの捕獲は倒した敵を仲間にするので、表示上0になったHPを戻す必要がある。
    if (ev.unit && unit && typeof api.applyStats === 'function') api.applyStats(unit, ev.unit);
    if (typeof api.moveOnBoard === 'function') api.moveOnBoard(unit, ev);
  };
  if (!unit || typeof api.motion !== 'function') { applyBoard(); return true; }
  await api.motion(unit, ev.side, toSide, applyBoard);
  return true;
}

// ── 変身 ────────────────────────────────────
// その場で姿と数値が入れ替わる演出。据え置いている表示値もここで進める。
// api: findUnit(side,id) / setForm(unit, ev) / advanceShown(unit) / render()
function presentTransformEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  // **PvEの体はコアが計算し終えた最終状態そのもの**（state.units と同じ参照。変身もコアで適用済み）。
  // そこへ変身時点の写し（ev.unit）を上書きすると、変身後に受けたダメージ・死亡・演出中の印まで巻き戻る。
  // ペガサスの攻撃効果でバンダースナッチが攻撃対象をペリカンにした時、攻撃が途中で戻り、
  // 倒したペリカンが盤面に残っていた（2026-09-29 利用者報告）。写しを使うのはオンライン（1手ずつ進める再生用の盤面）だけ。
  if (!api.unitIsFinalState) {
    if (ev.unit) Object.assign(unit, ev.unit);
    else if (typeof api.setForm === 'function') api.setForm(unit, ev);
  }
  // 命中した変身の姿まで進める。PvEの実体はさらに先の変身済みの場合がある。
  if (typeof battleFxHoldForm === 'function') battleFxHoldForm(unit, ev.unit || { ...unit });
  // 画面の数値は「変身した時点」の値まで進める（最終値まで進めると、その後のダメージより先にHPが減って見える）。
  if (typeof api.advanceShown === 'function') api.advanceShown(unit, ev);
  if (typeof api.render === 'function') api.render();
  return true;
}

// ── 封印の付与 ────────────────────────────────
// PvEの体はコアの最終状態なので、値の書き戻しはオンラインのアダプタだけが行う。
function presentSealApplyEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  if (typeof api.applyState === 'function') api.applyState(unit, ev);
  unit._sealShownPending = true;
  if (ev.fromDeath) {
    // 死亡表示のHP0を、コアが確定した「封印中の体」のHPへ進める。
    if (typeof presentAdvanceShown === 'function') presentAdvanceShown(unit, ev);
    delete unit._deathFxStarted;
    delete unit._deathFxReady;
    delete unit._deathFxDone;
  }
  if (typeof api.render === 'function') api.render();
  return true;
}

// ── 封印の解放 ────────────────────────────────
// api: findUnit(side,id) / applyState(unit,ev)（表示用の体だけ） / compact()
async function presentSealReleaseEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  if (typeof api.applyState === 'function') api.applyState(unit, ev);
  // **ここで初めて封印の見た目を解く。**
  // コアは計算の時点で `_sealed` を落とすが、演出はその後を追って再生される。
  // 暗転を `_sealed` だけで決めていたため、画面ではまだ味方が生きているのに
  // 封印キャラだけ先に明るくなっていた。印は再生前に立てておく（battle_events.js）。
  // 後続の再封印まで計算済みでも、今は解放された姿を見せる。コアの値は戻さない。
  unit._sealShownPending = false;
  if (typeof playSealReleaseVfx === 'function') {
    await playSealReleaseVfx(unit, ev.side === 'p2' ? 'enemy' : 'ally');
  }
  delete unit._sealReady;
  if (typeof api.compact === 'function') api.compact();
  return true;
}

// ── 逃走（ATKが0になって場を去る）────────────────────
// 死亡ではないので死亡効果は出ない。演出を見せてから盤面から外す。
// 先に外すとカードが一瞬で消え、何が起きたのか分からない。
// api: findUnit(side,id) / removeFromBoard(unit, side) / compact()
// ── 逃走 ────────────────────────────────────
// **同じ瞬間に逃走する体は、開戦の登場と同じ間隔でずらして見せる。**
// （利用者指定。ATK0での逃走は複数体が同時に起きる）
// 間隔の総尺は開戦の登場（_playBattleOpeningLaneStep の totalSpan）と同じ。
// **ATKの表示はここでは触らない。** 0になる瞬間は stat_change が実際の時刻で見せている。
// ここで0へ進め直すと、その分だけ逃走が遅れて「1テンポ遅い」ように見える。
const PRESENT_FLED_STAGGER_TOTAL_MS = 360;
async function presentFledBatch(evs, api) {
  const list = (Array.isArray(evs) ? evs : [evs]).filter(Boolean);
  if (!list.length || !api) return false;
  const entries = [];
  list.forEach(ev => {
    if (typeof api.isDone === 'function' && api.isDone(ev)) return;
    const unit = api.findUnit(ev.side, ev.unitId);
    if (!unit) return;
    if (typeof api.markDone === 'function') api.markDone(ev);
    entries.push({ ev, unit });
  });
  if (!entries.length) return false;
  // **左のキャラから順に逃走させる。**（利用者指定）
  // 並びは配列順ではなく**画面上の位置**で決める（詰め直しで配列順とずれることがある）。
  if (entries.length > 1 && typeof getCurrentUnitSlot === 'function') {
    const leftOf = ({ ev, unit }) => {
      const el = getCurrentUnitSlot(ev.side === 'p1' ? 'ally' : 'enemy', unit);
      const r = el && el.getBoundingClientRect();
      return r && r.width ? r.left : Number.MAX_SAFE_INTEGER;
    };
    const order = new Map(entries.map(e => [e, leftOf(e)]));
    entries.sort((a, b) => order.get(a) - order.get(b));
  }
  // FLED の表示と逃走VFXのどちらよりも先に話す。
  await _presentOutcomeLineEntries(entries.map(entry => ({ ...entry, side: entry.ev.side })), 'flee', api);
  entries.forEach(({ unit }) => { unit._fled = true; });
  const count = entries.length;
  const interval = count > 1 ? PRESENT_FLED_STAGGER_TOTAL_MS / (count - 1) : 0;
  await Promise.all(entries.map(({ ev, unit }, i) => (async () => {
    if (i && interval) {
      if (typeof api.sleep === 'function') await api.sleep(Math.round(i * interval));
      else await new Promise(resolve => setTimeout(resolve, Math.round(i * interval)));
    }
    if (typeof playFledVfx === 'function') {
      try { await playFledVfx(ev.side === 'p1' ? 'ally' : 'enemy', unit); }
      catch (err) { console.error('[fled vfx]', err); }
    }
  })()));
  // **盤面から外して詰めるのは全員ぶんで1回。** 1体ずつ詰めると、
  // まだ逃げている途中のカードが動いて位置がずれる。
  entries.forEach(({ ev, unit }) => {
    if (typeof api.removeFromBoard === 'function') api.removeFromBoard(unit, ev.side);
  });
  if (typeof api.compact === 'function') api.compact();
  return true;
}
async function presentFledEvent(ev, api) {
  return presentFledBatch([ev], api);
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
//   defeatKey  … 負けたときの文字（テキストメッセージシートの場面）。指定すると敗北表示になる（既定は撤退）
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
  // 分岐は増やさず、呼び出し側が defeatKey で選ぶ。
  const loseMode = api.defeatKey ? 'defeat' : 'retreat';
  const overlay = await showBattleCutin(withdraw || !win ? loseMode : 'victory', { durationMs, resultKey: api.defeatKey });
  if (typeof api.extra === 'function') await api.extra(overlay);
  if (typeof api.afterShown === 'function') await api.afterShown(overlay);
  return overlay;
}

if (typeof window !== 'undefined') {
  window.presentBeginActionBannerEvent = presentBeginActionBannerEvent;
  window.presentEndActionBannerEvent = presentEndActionBannerEvent;
  window.presentDamageEvent = presentDamageEvent;
  window.presentAttackContactHits = presentAttackContactHits;
  window.presentInsertSummonedUnit = presentInsertSummonedUnit;
  window.presentDamageSfxBatch = presentDamageSfxBatch;
  window.presentShieldLostEvent = presentShieldLostEvent;
  window.presentKeywordEffectEvent = presentKeywordEffectEvent;
  window.presentFledEvent = presentFledEvent;
  window.presentStatChangeEvent = presentStatChangeEvent;
  window.presentRunEffectEvent = presentRunEffectEvent;
  window.presentSealReleaseEvent = presentSealReleaseEvent;
  window.presentSealApplyEvent = presentSealApplyEvent;
  window.presentTransformEvent = presentTransformEvent;
  window.presentDeathEvent = presentDeathEvent;
  window.presentDeathBatch = presentDeathBatch;
  window.presentOutcomeEventLines = presentOutcomeEventLines;
  window.presentAttackContactOutcomeLines = presentAttackContactOutcomeLines;
  window.presentPlayerDefeatLines = presentPlayerDefeatLines;
  window.presentManaThresholdEvent = presentManaThresholdEvent;
window.presentEffectFlashEvent = presentEffectFlashEvent;
  window.presentUnitStolenEvent = presentUnitStolenEvent;
  window.presentFledBatch = presentFledBatch;
  window.presentInstantDeathEvent = presentInstantDeathEvent;
  window.presentQueueEffectFlash = presentQueueEffectFlash;
  window.presentFlushEffectFlashes = presentFlushEffectFlashes;
  window.presentResetEffectFlashes = presentResetEffectFlashes;
window.presentReviveEvent = presentReviveEvent;
  window.presentAttackContactVfxEvent = presentAttackContactVfxEvent;
  window.presentRecordAttackEvent = presentRecordAttackEvent;
  window.presentGoldGainEvent = presentGoldGainEvent;
  window.presentSummonPlacement = presentSummonPlacement;
  window.presentBattleResultCutin = presentBattleResultCutin;
  window.PRESENT_RESULT_CUTIN_MS = PRESENT_RESULT_CUTIN_MS;
  window.PRESENT_RESULT_AUTO_CONTINUE_MS = PRESENT_RESULT_AUTO_CONTINUE_MS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    presentBeginActionBannerEvent, presentEndActionBannerEvent,
    presentDamageEvent, presentDamageSfxBatch, presentShieldLostEvent, presentAttackContactHits, presentFledEvent,
    presentKeywordEffectEvent, presentInstantDeathEvent,
    presentStatChangeEvent, presentRunEffectEvent, presentSealApplyEvent, presentSealReleaseEvent, presentTransformEvent,
    presentDeathEvent, presentDeathBatch, presentOutcomeEventLines, presentAttackContactOutcomeLines,
    presentPlayerDefeatLines, presentManaThresholdEvent, presentSummonPlacement, presentInsertSummonedUnit, presentReviveEvent,
    presentEffectFlashEvent, presentUnitStolenEvent, presentFledBatch, presentQueueEffectFlash, presentFlushEffectFlashes, presentResetEffectFlashes,
    presentRecordAttackEvent,
    presentGoldGainEvent,
    presentBattleResultCutin, PRESENT_RESULT_CUTIN_MS, PRESENT_RESULT_AUTO_CONTINUE_MS,
  };
}
