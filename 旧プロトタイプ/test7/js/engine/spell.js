// ═══════════════════════════════════════
// spell.js — 魔法使用ロジック
// 依存: constants.js, state.js, battle.js, render.js, summon.js
// ═══════════════════════════════════════

let _tgtCtx=null;
let _swapFirst=-1;
let _spreadTargetPending=false;
let _spreadPick=null;

function _selectedUnitCanAct(unit){
  if(G.phase==='battle_end') return !!unit;
  return !!unit&&!unit._actedThisTurn;
}

function getUnitRings(unit){
  if(!unit) return [];
  if(typeof ensureUnitLoadout==='function') ensureUnitLoadout(unit);
  if(typeof isHumanEquipmentMode==='function'&&isHumanEquipmentMode(unit)&&typeof getHumanEquippedRings==='function'){
    return getHumanEquippedRings(unit);
  }
  return Array.isArray(unit.rings)?unit.rings:[];
}

function unitHasRing(unit, unique){
  return getUnitRings(unit).some(r=>r&&r.unique===unique);
}

function manualAttackRepeats(unit){
  let n=1;
  if(unitHasRing(unit,'ring_rage')) n=Math.max(n,2);
  const kws=unit&&unit.keywords||[];
  if(kws.includes('三段攻撃')) n=Math.max(n,3);
  if(kws.includes('二段攻撃')) n=Math.max(n,2);
  return n;
}

function manualAttackTargetsAll(unit){
  return unitHasRing(unit,'ring_madness')||unitHasRing(unit,'ring_storm');
}

function applyRingAttackAfterDamage(attacker,totalDealt,killedEnemy){
  if(!attacker||attacker.hp<=0) return;
  if(totalDealt>0&&unitHasRing(attacker,'ring_toughness')){
    attacker.armor=(attacker.armor||0)+totalDealt;
    log(`${attacker.name}：強靭の指輪→装甲+${totalDealt}`,'good');
  }
  if(killedEnemy&&unitHasRing(attacker,'ring_secret')){
    if(typeof onGoldGained==='function') onGoldGained(1);
    else G.gold=(G.gold||0)+1;
    log(`${attacker.name}：秘紋の指輪→ソウル+1`,'gold');
  }
  if(unitHasRing(attacker,'ring_kishin')){
    G.allies.forEach(a=>{
      if(!a||a.hp<=0||a._isSoul||a._isObject) return;
      a.atk=(a.atk||0)+8;
      a.baseAtk=(a.baseAtk||0)+8;
      a._kishinTempAtk=(a._kishinTempAtk||0)+8;
    });
    log(`${attacker.name}：鬼神の指輪→戦闘終了まで仲間パワー+8`,'good');
  }
}

function useSpell(idx){
  if(_spreadTargetPending) return; // 拡散の対象選択中は他の杖使用を禁止
  const owner=typeof syncSelectedUnitLoadout==='function'?syncSelectedUnitLoadout():null;
  const sp=G.spells[idx];
  if(!sp) return;
  if(typeof isOccupiedSlot==='function'&&isOccupiedSlot(sp)) return;
  const inMap=G.phase==='map';
  const worldMapUseLocked=typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&(
    G.phase==='reward'||G._mapChoiceOpen||G._worldMapFreeRecruit||G._fromWorldMapShop||G._isShop
  );
  if(worldMapUseLocked){
    setHint('このフェイズでは杖・アイテムは使用できません');
    return;
  }
  if((sp.type==='wand'||sp.type==='weapon')&&sp.usesLeft<=0) return;
  if(G.phase==='player'&&owner&&!_selectedUnitCanAct(owner)&&!G._debugMode){
    setHint('この仲間は行動済みです');
    return;
  }
  if(inMap&&(sp.needsEnemy||sp.effect==='charm'||sp.effect==='swap_pos')){
    setHint('マップ上では対象の敵がいません');
    return;
  }
  if(G.actionsLeft<=0&&!inMap&&!G._debugMode&&!canUseGremlinFreeItem(sp)) return;
  if(typeof playCardUseVfx==='function') playCardUseVfx(idx);
  if(G.phase==='player'&&owner&&sp.type==='weapon'){
    if(sp.weaponMode==='all') applyWeapon(sp,idx,null);
    else pickWeaponTarget(idx);
    return;
  }
  if(sp.effect==='swap_pos'){ startSwapPick(idx); return; }
  if(sp.effect==='charm'){ pickTargetCharm(idx); return; }
  if(sp.needsAlly) pickTarget('ally',idx);
  else if(sp.needsEnemy) pickTarget('enemy',idx,true); // 加護チェックあり
  else if(sp.needsAny) pickTargetAny(idx);
  else applySpell(sp,idx,null);
}

function useUnitInventoryCard(slotIdx){
  const owner=typeof syncSelectedUnitLoadout==='function'?syncSelectedUnitLoadout():null;
  if(!owner||owner.hp<=0) return;
  if(!_selectedUnitCanAct(owner)&&!G._debugMode){
    setHint('この仲間は行動済みです');
    return;
  }
  if(typeof isHumanEquipmentMode==='function'&&isHumanEquipmentMode(owner)){
    useSpell(slotIdx);
    return;
  }
  if(slotIdx===0){
    pickPunchTarget();
    return;
  }
  useSpell(slotIdx-1);
}

function pickPunchTarget(){
  clearSelectable();
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():syncSelectedUnitLoadout();
  if(!owner||!_selectedUnitCanAct(owner)) return;
  const action=typeof makePunchCard==='function'?makePunchCard(owner):{name:'パンチ'};
  setHint(`${action.name}の対象を選択（ESC or 右クリックでキャンセル）`);
  _getEnemyDomSlots().forEach((slot,i)=>{
    const e=G.enemies[i];
    if(e&&e.hp>0&&!slot.classList.contains('has-move')){
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applyPunch(i); };
    }
  });
  _addCancelListeners();
}

function applyPunch(enemyIdx){
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():syncSelectedUnitLoadout();
  const enemy=G.enemies[enemyIdx];
  if(!owner||owner.hp<=0||!_selectedUnitCanAct(owner)||!enemy||enemy.hp<=0) return;
  const action=typeof makePunchCard==='function'?makePunchCard(owner):{name:'パンチ',power:0};
  const dmg=Math.max(0,(owner.atk||0)+(Number(action.power||0)||0));
  const targets=manualAttackTargetsAll(owner)
    ?G.enemies.map((u,i)=>({u,i})).filter(ref=>ref.u&&ref.u.hp>0&&!ref.u._isObject)
    :[{u:enemy,i:enemyIdx}];
  const repeat=Math.max(1,manualAttackRepeats(owner));
  let totalDealt=0;
  let killedEnemy=false;
  for(let r=0;r<repeat;r++){
    targets.forEach(ref=>{
      if(owner.hp<=0||!ref.u||ref.u.hp<=0) return;
      const before=ref.u.hp;
      log(`${owner.name}：${action.name}${r>0?` ${r+1}段目`:''}→${ref.u.name}`,'good');
      dealDmgToEnemy(ref.u,dmg,ref.i,owner);
      totalDealt+=Math.max(0,before-Math.max(0,ref.u?ref.u.hp:0));
      if(ref.u&&ref.u.hp<=0) killedEnemy=true;
    });
  }
  applyRingAttackAfterDamage(owner,totalDealt,killedEnemy);
  if(typeof finishSelectedAllyAction==='function') finishSelectedAllyAction();
  renderAll();
  if(typeof checkInstantVictory==='function'&&checkInstantVictory()) return;
}

function pickWeaponTarget(idx){
  clearSelectable();
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():syncSelectedUnitLoadout();
  const sp=G.spells[idx];
  if(!owner||!_selectedUnitCanAct(owner)||!sp||sp.usesLeft<=0) return;
  const allowEmpty=sp.weaponMode==='twin';
  setHint(`${sp.name}の対象を選択（ESC or 右クリックでキャンセル）`);
  _getEnemyDomSlots().forEach((slot,i)=>{
    const e=G.enemies[i];
    if(slot.classList.contains('has-move')) return;
    if((e&&e.hp>0)||allowEmpty){
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applyWeapon(sp,idx,i); };
    }
  });
  _addCancelListeners();
}

function _weaponPower(sp,attacker){
  const base=Math.max(0,(attacker&&attacker.atk)||0);
  const bonus=sp.power==='durability'?Math.max(0,sp.usesLeft||0):(Number(sp.power||0)||0);
  return base+bonus;
}

function _weaponTargetRefs(sp,targetIdx,attacker){
  const mode=sp.weaponMode||'single';
  if(attacker&&manualAttackTargetsAll(attacker)&&mode!=='all'){
    return G.enemies.map((u,i)=>({side:'enemy',u,i})).filter(ref=>ref.u&&ref.u.hp>0&&!ref.u._isObject);
  }
  if(mode==='all'){
    const refs=[];
    G.allies.forEach((u,i)=>{ if(u&&u.hp>0) refs.push({side:'ally',u,i}); });
    G.enemies.forEach((u,i)=>{ if(u&&u.hp>0) refs.push({side:'enemy',u,i}); });
    return refs;
  }
  const idxs=mode==='twin'?[targetIdx-1,targetIdx+1]:mode==='triple'?[targetIdx-1,targetIdx,targetIdx+1]:[targetIdx];
  return idxs
    .filter(i=>i>=0&&i<G.enemies.length)
    .map(i=>({side:'enemy',u:G.enemies[i],i}))
    .filter(ref=>ref.u&&ref.u.hp>0);
}

function _damageWeaponTarget(ref,dmg,attacker,sp){
  if(!ref||!ref.u||ref.u.hp<=0) return {killed:false,dealt:0};
  const before=ref.u.hp;
  if(ref.side==='enemy'){
    dealDmgToEnemy(ref.u,dmg,ref.i,attacker,true);
    if(ref.u&&attacker&&attacker.hp>0&&typeof _mutualStrikeBack==='function'){
      _mutualStrikeBack(attacker,false,ref.u,ref.u.atk||0);
    }
  } else {
    dealDmgToAlly(ref.u,dmg,ref.i,attacker,true,true);
  }
  if(sp.weaponKeyword==='instant'&&ref.u&&ref.u.hp>0){
    ref.u.hp=0;
    if(ref.side==='enemy') processEnemyDeath(ref.u,ref.i);
    else onAllyDeath(ref.u,ref.i);
  }
  return {killed:!ref.u||ref.u.hp<=0,dealt:Math.max(0,before-Math.max(0,ref.u?ref.u.hp:0))};
}

function applyWeapon(sp,idx,targetIdx){
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():syncSelectedUnitLoadout();
  if(!owner||owner.hp<=0||!_selectedUnitCanAct(owner)||!sp||sp.usesLeft<=0) return;
  const targets=_weaponTargetRefs(sp,targetIdx,owner);
  if(!targets.length){ setHint('対象がいません。'); return; }
  const dmg=_weaponPower(sp,owner);
  const repeat=Math.max(1,Number(sp.repeat||1)||1,manualAttackRepeats(owner));
  let killedEnemy=false;
  let totalDealt=0;
  log(`${owner.name}：${sp.name}（${dmg}ダメージ）`,'good');
  if(sp.weaponKeyword==='armor8'){
    owner.armor=(owner.armor||0)+8;
    log(`${owner.name}：装甲8を得た（装甲${owner.armor}）`,'good');
  }
  for(let r=0;r<repeat;r++){
    targets.forEach(ref=>{
      if(owner.hp<=0||!ref.u||ref.u.hp<=0) return;
      const result=_damageWeaponTarget(ref,dmg,owner,sp);
      totalDealt+=result.dealt||0;
      if(ref.side==='enemy'&&result.killed) killedEnemy=true;
    });
  }
  if(sp.weaponKeyword==='lifesteal'&&totalDealt>0&&owner.hp>0){
    owner.hp=Math.min(owner.maxHp||owner.hp,owner.hp+totalDealt);
    log(`${owner.name}：生命吸収で${totalDealt}回復`,'good');
  }
  if(sp.lethalEffect==='soul1'&&killedEnemy){
    if(typeof onGoldGained==='function') onGoldGained(1); else G.gold=(G.gold||0)+1;
    log(`${sp.name}：致命でソウル+1`,'good');
  }
  applyRingAttackAfterDamage(owner,totalDealt,killedEnemy);
  const skipDurability=sp.lethalEffect==='no_durability_loss'&&killedEnemy;
  if(!skipDurability&&sp.usesLeft!==Infinity) sp.usesLeft=Math.max(0,(sp.usesLeft||0)-1);
  else if(skipDurability) log(`${sp.name}：致命で耐久度が減らない`,'good');
  if(sp.usesLeft<=0){
    log(`${sp.name}の耐久度が尽きた`,'sys');
    if(typeof removeInventoryCardAt==='function') removeInventoryCardAt(G.spells,idx);
    else G.spells[idx]=null;
  }
  if(typeof finishSelectedAllyAction==='function') finishSelectedAllyAction();
  renderAll();
  if(typeof checkInstantVictory==='function'&&checkInstantVictory()) return;
}

// 転移の杖：2体選択UI（味方-味方 または 敵-敵）
function startSwapPick(idx){
  clearSelectable(); // 前の選択状態を必ずクリア
  _swapFirst=-1;
  setHint('入れ替える1体目を選択（味方同士または敵同士・ESC or 右クリックでキャンセル）');
  // 味方スロット
  _getAllyDomSlots().forEach((slot,i)=>{
    if(G.allies[i]&&G.allies[i].hp>0){
      slot.classList.add('selectable');
      slot.onclick=()=>{
        clearSelectable();
        _swapFirst=i;
        setHint(`${G.allies[i].name}を選択。2体目の味方を選択（ESC or 右クリックでキャンセル）`);
        _getAllyDomSlots().forEach((s2,j)=>{
          if(G.allies[j]&&G.allies[j].hp>0&&j!==i){
            s2.classList.add('selectable');
            s2.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'pair',team:'ally',idx1:_swapFirst,idx2:j}); _swapFirst=-1; };
          }
        });
        _addCancelListeners();
      };
    }
  });
  // 敵スロット
  _getEnemyDomSlots().forEach((slot,i)=>{
    if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){
      slot.classList.add('selectable');
      slot.onclick=()=>{
        clearSelectable();
        _swapFirst=i;
        setHint(`${G.enemies[i].name}を選択。2体目の敵を選択（ESC or 右クリックでキャンセル）`);
        _getEnemyDomSlots().forEach((s2,j)=>{
          if(G.enemies[j]&&G.enemies[j].hp>0&&!s2.classList.contains('has-move')&&j!==i){
            s2.classList.add('selectable');
            s2.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'pair',team:'enemy',idx1:_swapFirst,idx2:j}); _swapFirst=-1; };
          }
        });
        _addCancelListeners();
      };
    }
  });
  _addCancelListeners();
}

// 任意キャラクター選択（needsAny）
function pickTargetAny(idx){
  clearSelectable(); // 前の選択状態をリセット
  _tgtCtx={who:'any',idx};
  setHint('対象を選択（ESC or 右クリックでキャンセル）');
  // 味方
  _getAllyDomSlots().forEach((slot,i)=>{
    if(G.allies[i]&&G.allies[i].hp>0){
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'ally',idx:i}); };
    }
  });
  if(G.phase==='reward'){
    // 報酬フェイズ：報酬キャラクターを選択肢に追加
    document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
      const ri=parseInt(slot.dataset.rewIdx);
      const c=_rewCards[ri];
      if(!c||!c._isChar||c.hp<=0) return;
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'rew-char',idx:ri}); };
    });
  } else if(G.phase!=='map'){
    // 戦闘中：敵を選択肢に追加
    _getEnemyDomSlots().forEach((slot,i)=>{
      if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){
        slot.classList.add('selectable');
        slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'enemy',idx:i}); };
      }
    });
  }
  _addCancelListeners();
}

function pickTarget(who,idx,checkBless){
  clearSelectable(); // 前の選択状態をリセット
  _tgtCtx={who,idx};
  setHint(`対象を選択（ESC or 右クリックでキャンセル）`);
  if(G.phase==='map'&&who==='enemy'){
    setHint('マップ上では対象の敵がいません');
    return;
  }
  // 報酬フェイズ中に「敵」を対象にする場合は報酬キャラクターをターゲットにする
  if(G.phase==='reward'&&who==='enemy'){
    document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
      const ri=parseInt(slot.dataset.rewIdx);
      const c=_rewCards[ri];
      if(!c||!c._isChar||c.hp<=0) return;
      if(checkBless&&c.keywords&&c.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'rew-char',idx:ri}); };
    });
    _addCancelListeners();
    return;
  }
  const units=who==='ally'?G.allies:G.enemies;
  (who==='ally'?_getAllyDomSlots():_getEnemyDomSlots()).forEach((slot,i)=>{
    const u=units[i];
    if(u&&u.hp>0&&!slot.classList.contains('has-move')){
      // 加護：杖の効果対象にならない
      if(checkBless&&who==='enemy'&&u.keywords&&u.keywords.includes('加護')){
        slot.classList.add('bless-blocked'); // グレーアウト表示
        return;
      }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who,idx:i}); };
    }
  });
  _addCancelListeners();
}

// 魅了の杖専用：ATK > 魔術レベルの敵は選択不可（加護と同様にグレーアウト）
function pickTargetCharm(idx){
  clearSelectable();
  _tgtCtx={who:'enemy',idx};
  setHint(`対象を選択（ESC or 右クリックでキャンセル）`);
  if(G.phase==='map'){
    setHint('マップ上では対象の敵がいません');
    return;
  }
  const ml=G.magicLevel||1;
  if(G.phase==='reward'){
    document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
      const ri=parseInt(slot.dataset.rewIdx);
      const c=(_rewCards||[])[ri];
      if(!c||!c._isChar||c.hp<=0) return;
      if(c.keywords&&c.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
      if(c.atk>ml){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'rew-char',idx:ri}); };
    });
  } else {
    _getEnemyDomSlots().forEach((slot,i)=>{
      const u=G.enemies[i];
      if(!u||u.hp<=0||slot.classList.contains('has-move')) return;
      if((u.keywords&&u.keywords.includes('加護'))||u.atk>ml){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'enemy',idx:i}); };
    });
  }
  _addCancelListeners();
}

function _cancelPick(){
  document.removeEventListener('keydown',_cancelPickKD);
  document.removeEventListener('contextmenu',_cancelPickCM);
  clearSelectable();
  if(G.phase==='reward'){ renderRewCards(); renderFieldEditor(); renderMoveSlotsInEnemy(); setHint('報酬を獲得してください'); }
  else { renderHand(); setHint('行動を終えたらターン終了してください。'); }
}
function _cancelPickKD(e){ if(e.key==='Escape') _cancelPick(); }
function _cancelPickCM(e){ e.preventDefault(); _cancelPick(); }
function _addCancelListeners(){
  document.removeEventListener('keydown',_cancelPickKD);
  document.removeEventListener('contextmenu',_cancelPickCM);
  document.addEventListener('keydown',_cancelPickKD);
  document.addEventListener('contextmenu',_cancelPickCM);
}
// 拡散専用キャンセル（_spreadTargetPending もリセット）
function _cancelSpread(){
  document.removeEventListener('keydown',_cancelSpreadKD);
  document.removeEventListener('contextmenu',_cancelSpreadCM);
  clearSelectable(); _spreadTargetPending=false;
  if(G.phase==='reward'){
    renderRewCards(); renderFieldEditor(); renderMoveSlotsInEnemy(); setHint('報酬を獲得してください');
  } else {
    renderHand(); setHint('行動を終えたらターン終了してください。');
  }
}
function _cancelSpreadKD(e){ if(e.key==='Escape') _cancelSpread(); }
function _cancelSpreadCM(e){ e.preventDefault(); _cancelSpread(); }
function _addSpreadCancelListeners(){
  document.removeEventListener('keydown',_cancelSpreadKD);
  document.removeEventListener('contextmenu',_cancelSpreadCM);
  document.addEventListener('keydown',_cancelSpreadKD);
  document.addEventListener('contextmenu',_cancelSpreadCM);
}
// 後方互換
function escCancel(e){ if(e.key==='Escape') _cancelPick(); }

// 拡散の杖：対象選択が必要な右隣杖のためのピッカー
function _pickForSpread(rw,rightIdx){
  setHint(`拡散：${rw.name}の対象を選択（ESC or 右クリックでキャンセル）`);
  const applyFn=tgt=>applySpell(rw,rightIdx,tgt,true); // _noDecrement=true：右隣杖のチャージ消費なし
  if(rw.needsAny){
    _getAllyDomSlots().forEach((slot,i)=>{
      if(G.allies[i]&&G.allies[i].hp>0){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'ally',idx:i}); }; }
    });
    _getEnemyDomSlots().forEach((slot,i)=>{
      if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'enemy',idx:i}); }; }
    });
  } else if(rw.needsEnemy){
    const _charmML=rw.effect==='charm'?(G.magicLevel||1):null;
    if(G.phase==='reward'){
      document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
        const ri=parseInt(slot.dataset.rewIdx);
        const c=_rewCards[ri];
        if(!c||!c._isChar||c.hp<=0) return;
        if(_charmML!==null&&c.atk>_charmML){ slot.classList.add('bless-blocked'); return; }
        slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'rew-char',idx:ri}); };
      });
    } else {
      _getEnemyDomSlots().forEach((slot,i)=>{
        const u=G.enemies[i]; if(!u||u.hp<=0||slot.classList.contains('has-move')) return;
        if(u.keywords&&u.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
        if(_charmML!==null&&u.atk>_charmML){ slot.classList.add('bless-blocked'); return; }
        slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'enemy',idx:i}); };
      });
    }
  } else if(rw.needsAlly){
    _getAllyDomSlots().forEach((slot,i)=>{
      if(G.allies[i]&&G.allies[i].hp>0){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'ally',idx:i}); }; }
    });
  }
  _addSpreadCancelListeners();
}

function clearSelectable(){
  document.removeEventListener('keydown',_cancelPickKD);
  document.removeEventListener('contextmenu',_cancelPickCM);
  document.removeEventListener('keydown',_cancelSpreadKD);
  document.removeEventListener('contextmenu',_cancelSpreadCM);
  document.querySelectorAll('.selectable').forEach(s=>{ s.classList.remove('selectable'); s.onclick=null; });
  document.querySelectorAll('.bless-blocked').forEach(s=>s.classList.remove('bless-blocked'));
}

function finishTargetSelection(hintText){
  clearSelectable();
  _tgtCtx=null;
  _swapFirst=-1;
  _spreadTargetPending=false;
  _spreadPick=null;
  if(!hintText) hintText=G.phase==='reward'?'報酬を獲得してください':'行動を終えたらターン終了してください。';
  if(typeof setHint==='function') setHint(hintText);
}

function _addCoveringLaneDrop(slot,i,onclickFn){ /* no-op */ }

function _isWandUseCard(sp){
  return !!(sp && (sp.type === 'wand' || sp.subtype === 'wand'));
}

function applySpell(sp,idx,tgt,_noDecrement,_suppressWandTriggers){
  clearSelectable();
  log(`→ ${sp.name} を使用`,'em');
  if(typeof playSpellSfx==='function') playSpellSfx(sp);

  // 触媒の指輪：杖の効果が2倍
  const catRingC=G.rings.find(r=>r&&r.unique==='catalyst_ring');
  const _isWandUse=_isWandUseCard(sp);
  const cMult=(_isWandUse&&catRingC)?2:1;
  const _inReward=G.phase==='reward';
  const _inMap=G.phase==='map';
  _spreadTargetPending=false;
  _spreadPick=null;
  // インキュバス：アイテム使用時、効果処理の前にナイトメアを召喚
  if(sp.type==='consumable'){
    G.allies.forEach(ic=>{
      if(!ic||ic.hp<=0||ic.effect!=='incubus_spell') return;
      const _nmDef=makeSheetBackedUnitDef({id:'c_nightmare',name:'ナイトメア',race:'悪魔',grade:1,atk:3,hp:1,cost:0,unique:false,icon:'😱',desc:''});
      const _nm=makeUnitFromDef(_nmDef);
      const _ei=G.allies.findIndex(a=>!a||a.hp<=0);
      if(_ei>=0){
        G.allies[_ei]=_nm;
        log(`${ic.name}：ナイトメア(4/1)を召喚`,'good');
        // グリマルキン（passive）・コカトリス：カード効果召喚バフ
        if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_nm,G.allies);
        if(typeof triggerCocatrice==='function') triggerCocatrice(_nm);
      }
    });
  }

  // 杖使用トリガーは杖本体の効果処理より先に発動する
  if(_isWandUse&&!_suppressWandTriggers){ onSpellUsed(); onWandUsed(); }

  switch(sp.effect){
    case 'fire':{
      const fd=G.magicLevel||1;
      if(tgt.who==='ally'){
        const a=G.allies[tgt.idx];
        if(a){ log(`炎の杖：${a.name}に${fd}ダメ`,'good'); dealDmgToAlly(a,fd,tgt.idx,null); }
      } else if(tgt.who==='rew-char'){
        const c=_rewCards[tgt.idx]; if(c){ log(`炎の杖：${c.name}に${fd}ダメ`,'good'); dealDmgToRewChar(tgt.idx,fd); }
      } else {
        const e=G.enemies[tgt.idx]; if(e){ log(`炎の杖：${e.name}に${fd}ダメ`,'good'); dealDmgToEnemy(e,fd,tgt.idx); }
      }
    break;}
    case 'hate':{
      if(tgt.who==='ally'){
        G.allies.forEach(a=>{ if(a) a.hate=false; });
        const a=G.allies[tgt.idx];
        if(a){ a.hate=true; a.hateTurns=99; log(`${a.name}に標的付与（敵が優先的に狙う）`,'good'); }
      } else if(tgt.who==='rew-char'){
        const c=_rewCards[tgt.idx]; if(c){ log(`${c.name}を優先ターゲットに設定`,'good'); }
      } else {
        G.enemies.forEach(e=>{ if(e) e.allyTarget=false; });
        const e=G.enemies[tgt.idx];
        if(e){ e.allyTarget=true; log(`${e.name}を強制ターゲットに設定（味方が優先的に狙う）`,'good'); }
      }
    break;}
    case 'double_hp':{ const a=G.allies[tgt.idx]; if(a){ a.hp*=2; a.maxHp*=2; log(`${a.name} HP×2→${a.hp}`,'good'); } break;}
    case 'swap_all':{
      // 死亡ユニットを除いてATK/HP入れ替え
      const _swapTargets=_inReward
        ?[...G.allies,..._rewCards.filter(c=>c&&c._isChar)]
        :[...G.allies,...G.enemies];
      _swapTargets.forEach(u=>{
        if(!u||u.hp<=0) return;
        const t=u.atk; u.atk=u.hp; u.hp=Math.max(1,t); u.maxHp=Math.max(u.maxHp,u.hp);
      });
      // 入れ替え後に狼オーラを再付与
      G.rings.forEach(r=>{
        if(!r||r.unique!=='wolf_aura') return;
        if(G.allies.some(a=>a&&a.hp>0&&a.ringId===r.id)){
          const bonus=r.grade||1;
          G.allies.forEach(a=>{ if(a&&a.hp>0) a.atk+=bonus; });
        }
      });
      log('全キャラATK/HP入れ替え','sys');
    break;}
    case 'nullify':{
      if(tgt.who==='rew-char'){ const rc=_rewCards[tgt.idx]; if(rc) log(`${rc.name}：報酬フェイズ中は沈黙効果なし`,'sys'); }
      else { const nu=G.enemies[tgt.idx]; if(nu){ nu.nullified=1; log(`${nu.name} 沈黙1T`,'good'); } }
    break;}
    case 'weaken':{
      const wu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(wu){
        wu._weakenedSavedAtk=wu.atk; // 元のATKを保存
        wu.atk=0;                     // 表示ATKを0に
        wu.nullified=1;
        wu._weakenPhaseApplied='player'; // プレイヤーフェーズ適用→次のapplyTurnStartで回復
        log(`${wu.name} 脱力1T（ATK→0）`,'good');
      }
    break;}
    case 'weaken_half':{
      const wu=tgt.who==='ally'?G.allies[tgt.idx]:(tgt.who==='enemy'?G.enemies[tgt.idx]:(tgt.who==='rew-char'?_rewCards[tgt.idx]:null));
      if(wu&&wu.hp>0){
        const _halved=Math.floor((wu.atk||0)/2);
        const _drop=(wu.atk||0)-_halved;
        wu.atk=_halved; wu.baseAtk=Math.max(0,(wu.baseAtk||0)-_drop);
        log(`${wu.name} のパワーが半減（ATK→${wu.atk}）`,'good');
      }
    break;}
    case 'stealth':{ const sa=G.allies[tgt.idx]; if(sa){ sa.stealth=true; log(`${sa.name}に隠密付与`,'good'); } break;}
    case 'poison_wand':{
      const pv=G.magicLevel||1;
      if(tgt.who==='rew-char'){ const rc=_rewCards[tgt.idx]; if(rc){ rc.poison=(rc.poison||0)+pv; log(`${rc.name}に毒+${pv}付与`,'good'); dealDmgToRewChar(tgt.idx,pv); } }
      else if(tgt.who==='ally'){ const pa=G.allies[tgt.idx]; if(pa&&pa.hp>0){ pa.poison=(pa.poison||0)+pv; log(`${pa.name}に毒+${pv}付与（毒${pa.poison}）`,'good'); } }
      else { const pe=G.enemies[tgt.idx]; if(pe&&pe.hp>0){ pe.poison=(pe.poison||0)+pv; log(`${pe.name}に毒+${pv}付与（毒${pe.poison}）`,'good'); } }
    break;}
    case 'sacrifice':{
      const si=tgt.idx;
      const sa2=G.allies[si]; if(!sa2) break;
      const dmg=sa2.atk;
      sa2.hp=0;
      processAllyDeath(sa2);
      log(`犠牲：${sa2.name}を破壊、全敵に${dmg}ダメ`,'good');
      G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dmg,ei); });
    break;}
    case 'boost_atk':{ const ba=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx]; if(ba&&ba.hp>0){ const bav=(G.magicLevel||1)+(G.hasGoldenDrop?1:0); ba.atk+=bav; ba.baseAtk=(ba.baseAtk||0)+bav; log(`${ba.name}：ATK+${bav}`,'good'); if(!_inReward) triggerDryadBuff(); } break;}
    case 'swap_pos':{
      if(!tgt||tgt.who!=='pair') break;
      const {idx1,idx2,team}=tgt;
      const _swapArr=team==='enemy'?G.enemies:G.allies;
      const tmp=_swapArr[idx1]; _swapArr[idx1]=_swapArr[idx2]; _swapArr[idx2]=tmp;
      log(`転移：${team==='enemy'?'敵':'味方'}スロット${idx1+1}↔${idx2+1}を入れ替え`,'good');
    break;}
    case 'doom':{ const dd=G.magicLevel||1;
      if(_inReward){ log(`破滅の杖：全報酬キャラに${dd}ダメ`,'good'); _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,dd); }); }
      else { log(`破滅の杖：全敵に${dd}ダメ`,'good'); G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dd,ei); }); }
    break;}
    case 'possess':{
      const pi=tgt.idx;
      const pa=G.allies[pi]; if(!pa) break;
      if(_inReward){
        // 報酬フェーズ：最もパワーの低い報酬キャラと入れ替え
        const rewLive=_rewCards.map((c,ri)=>({c,ri})).filter(({c})=>c&&c._isChar&&c.hp>0);
        if(!rewLive.length) break;
        const weakR=rewLive.reduce((m,x)=>x.c.atk<m.c.atk?x:m,rewLive[0]);
        const newAlly=makeUnitFromDef(weakR.c);
        // 仲間→報酬スロット、報酬キャラ→仲間フィールド
        G.allies[pi]=newAlly;
        _rewCards[weakR.ri]=Object.assign(clone(pa),{_isChar:true,_buyPrice:pa.cost||2});
        log(`憑依：${pa.name}⟺${weakR.c.name}（報酬枠${weakR.ri}）`,'good');
        // 召喚時効果（使役）
        applyUnitSummonEffect(newAlly, null);
        renderRewCards(); renderAll();
      } else {
        const liveE=G.enemies.map((e,i)=>({e,i})).filter(x=>x.e&&x.e.hp>0&&!x.e._isObject);
        if(!liveE.length) break;
        const weakE=liveE.reduce((m,x)=>x.e.atk<m.e.atk?x:m,liveE[0]);
        const ei=weakE.i;
        // チーム間で入れ替え：味方→敵陣、敵→味方陣
        // 憤激の指輪：味方が敵陣に移動→fury解除、敵が味方陣に移動→fury付与
        if(pa._furyAtk){ pa.atk-=pa._furyAtk; pa.baseAtk-=pa._furyAtk; delete pa._furyAtk; }
        const _possFuryR=G.rings&&G.rings.find(r=>r&&r.unique==='fury_start');
        if(_possFuryR){ const _fb=3*(_possFuryR.grade||1); weakE.e.atk+=_fb; weakE.e.baseAtk=(weakE.e.baseAtk||0)+_fb; weakE.e._furyAtk=_fb; }
        G.allies[pi]=weakE.e;
        G.enemies[ei]=pa;
        log(`憑依：${pa.name}(${pi+1})⟺${weakE.e.name}(${ei+1})`,'good');
        // 召喚時効果（使役）
        applyUnitSummonEffect(weakE.e, null);
      }
    break;}
    case 'battle_start_book':{ log('開幕の書：戦闘開始時効果を発動','good'); onBattleStart(); break;}
    case 'magic_book':{ const _mbv=1*cMult; onMagicLevelUp(_mbv); log(`叡智の薬：魔術レベル+${_mbv}（現在${G.magicLevel}）`,'good'); break;}
    case 'magic_book_3':{ const _mb3v=3*cMult; onMagicLevelUp(_mb3v); log(`賢者の秘薬：魔術レベル+${_mb3v}（現在${G.magicLevel}）`,'good'); break;}
    case 'sacrifice_doll':{
      if(!tgt) break;
      if(tgt.who==='rew-char'){
        const rc=_rewCards[tgt.idx]; if(!rc) break;
        _rewCards[tgt.idx]=null; log(`破壊の巻物：${rc.name}を破壊`,'good');
        renderRewCards();
      } else {
        const sdu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
        if(!sdu) break;
        if(tgt.who==='enemy'){
          if(sdu.boss){ log('破壊の巻物：ボスには効果がない','sys'); break; }
          if(sdu.keywords&&sdu.keywords.includes('エリート')){ log('破壊の巻物：エリートには効果がない','sys'); break; }
          log(`破壊の巻物：${sdu.name}を破壊`,'good');
          sdu.hp=0; processEnemyDeath(sdu,tgt.idx);
          break;
        } else { sdu.hp=0; processAllyDeath(sdu); } // 死亡効果（レイス等）を発動させる
        log(`破壊の巻物：${sdu.name}を破壊`,'good');
      }
    break;}
    case 'swap_stats':{
      if(!tgt) break;
      const ssu=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx];
      if(!ssu) break;
      const sst=ssu.atk; ssu.atk=ssu.hp; ssu.hp=sst; ssu.maxHp=Math.max(ssu.maxHp,ssu.hp);
      log(`混乱の杖：${ssu.name} ATK↔HP（${ssu.atk}/${ssu.hp}）`,'good');
      if(ssu.hp<=0){
        if(tgt.who==='enemy') processEnemyDeath(ssu,tgt.idx);
        else if(tgt.who==='ally') processAllyDeath(ssu);
        else { _rewCards[tgt.idx]=null; renderRewCards(); }
      }
    break;}
    case 'change_formation':{
      if(!tgt) break;
      const cfu=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='enemy'?G.enemies[tgt.idx]:_rewCards[tgt.idx];
      if(!cfu||cfu.hp<=0) break;
      if(tgt.who==='enemy'){
        if(cfu.hate&&cfu.hateTurns>0){
          // 前衛 → 後衛
          cfu.hate=false; cfu.hateTurns=0; cfu._visualShift=true;
          log(`撹乱の杖：${cfu.name}を後衛に変更`,'good');
        } else if(cfu._visualShift){
          // 後衛 → 前衛
          cfu._visualShift=false; cfu.hate=true; cfu.hateTurns=99;
          log(`撹乱の杖：${cfu.name}を前衛に変更`,'good');
        } else {
          // デフォルト → 前衛
          cfu.hate=true; cfu.hateTurns=99;
          log(`撹乱の杖：${cfu.name}を前衛に変更`,'good');
        }
      } else {
        if(cfu.hate&&cfu.hateTurns>0){
          // 前衛 → 後衛
          cfu.hate=false; cfu.hateTurns=0;
          log(`撹乱の杖：${cfu.name}を後衛に変更`,'good');
        } else {
          // 後衛/デフォルト → 前衛
          cfu.hate=true; cfu.hateTurns=99;
          log(`撹乱の杖：${cfu.name}を前衛に変更`,'good');
        }
      }
    break;}
    case 'counter_scroll':{
      const csa=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx];
      if(csa&&csa.hp>0){ csa.counter=true; if(!csa.keywords) csa.keywords=[]; if(!csa.keywords.includes('反撃')) csa.keywords.push('反撃'); log(`反逆の薬：${csa.name}に反撃付与`,'good'); }
    break;}
    case 'purify_hate':{
      if(!tgt) break;
      const phu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(phu){ phu.poison=0; log(`浄化の薬：${phu.name}の毒を消した`,'good'); }
    break;}
    case 'boost':{ const a=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx]; if(a&&a.hp>0){ const bv=(G.magicLevel||1)+(G.hasGoldenDrop?1:0); a.atk+=bv; a.baseAtk=(a.baseAtk||0)+bv; log(`${a.name}：ATK+${bv}`,'good'); if(!_inReward) triggerDryadBuff(); } break;}
    case 'rally':{ G.allies.forEach(a=>{ if(a&&a.hp>0) a.atk=Math.round(a.atk*1.2); }); log('全仲間ATK×1.2','good'); break;}
    case 'heal_ally':{ const _jkh=typeof getJackalopeHpBonus==='function'?getJackalopeHpBonus('ally'):0; G.allies.forEach(a=>{ if(a&&a.hp>0){ if(_jkh){ a.maxHp+=_jkh; } a.hp=a.maxHp; } }); log('全仲間HP全回復'+(_jkh?'（ジャッカロープ：最大HP+'+_jkh+'）':''),'good'); break;}
    case 'seal':{
      if(tgt.who==='rew-char'){ const rc=_rewCards[tgt.idx]; if(rc) log(`${rc.name}：報酬フェイズ中は封印効果なし`,'sys'); }
      else { const su=G.enemies[tgt.idx]; if(su){ su.sealed=1; log(`${su.name} 封印1T`,'good'); } }
    break;}
    case 'spread':{
      const rightIdx=idx+1;
      const rw=(rightIdx<(G.handSlots||5))?G.spells[rightIdx]:null;
      if(rw&&rw.type==='wand'&&(rw.usesLeft===undefined||rw.usesLeft>0)){
        log(`拡散：${rw.name}を発動`,'sys');
        if(!rw.needsEnemy&&!rw.needsAlly&&!rw.needsAny){
          G.actionsLeft++; // 内部呼出のデクリメントを補償
          applySpell(rw,rightIdx,null,true); // _noDecrement=true：右隣杖のチャージ消費なし
        } else {
          // 対象選択が必要な場合：renderAll後にピッカーを起動
          _spreadTargetPending=true;
          _spreadPick=()=>_pickForSpread(rw,rightIdx);
        }
      } else {
        log('拡散：右隣に有効な杖がない','sys');
      }
    break;}
    case 'instakill':{
      if(tgt){
        const iku=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
        if(iku&&iku.hp>0){
          if(!iku.keywords) iku.keywords=[];
          if(!iku.keywords.includes('即死')) iku.keywords.push('即死');
          log(`禁呪の薬：${iku.name}に即死を付与`,'good');
        }
      }
    break;}
    case 'growth_grant':{
      const gga=G.allies[tgt.idx];
      if(gga){
        if(!gga.keywords) gga.keywords=[];
        const _gi=gga.keywords.findIndex(k=>/^成長\d+$/.test(k));
        if(_gi>=0){ const _gv=parseInt(gga.keywords[_gi].slice(2)); gga.keywords[_gi]=`成長${_gv+3}`; }
        else gga.keywords.push('成長3');
        log(`成長の薬：${gga.name}に成長3を付与`,'good');
      }
    break;}
    case 'golem':{
      if(G.allies.filter(a=>a&&a.hp>0).length<6){
        const gl=G.magicLevel||1;
        const golemDef=makeSheetBackedUnitDef({id:'c_spell_golem',name:'ゴーレム',icon:'🗼',race:'-',grade:1,atk:gl,hp:gl,
          cost:0,unique:false,keywords:['アーティファクト']});
        const golem=makeUnitFromDef(golemDef, undefined, true);
        golem.ringId='w_golem'; golem.ringIdx=-1; golem.hate=true; golem.hateTurns=99;
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot>=0) G.allies[emptySlot]=golem;
        else if(G.allies.length<6) G.allies.push(golem);
        log(`🗼 ゴーレム（${gl}/${gl}）を前衛に召喚`,'good');
      }
    break;}
    case 'heal_wand_all':{
      const hv=(G.magicLevel||1);
      let _hvShown=hv;
      G.allies.forEach(a=>{ if(a&&a.hp>0){ _hvShown=addUnitHp(a,hv); }});
      log(`回復の杖：全仲間ライフ+${_hvShown}`,'good');
    break;}
    case 'transform_wand':{
      const tu=tgt.who==='ally'?G.allies[tgt.idx]:(tgt.who==='enemy'?G.enemies[tgt.idx]:(tgt.who==='rew-char'?_rewCards[tgt.idx]:null));
      if(tu&&tu.hp>0){
        const _tg=tu.grade||1;
        const _tpool=(typeof UNIT_POOL!=='undefined'?UNIT_POOL:[]).filter(u=>u&&u.id&&!u.unique&&u.id!=='c_golem'&&(u.grade||1)===_tg&&u.rarity!==-1&&u.name!==tu.name);
        if(_tpool.length){
          const _tdef=_tpool[Math.floor(Math.random()*_tpool.length)];
          const _newU=makeUnitFromDef(_tdef);
          if(tgt.who==='ally'){
            G.allies[tgt.idx]=_newU;
            if(typeof checkSolitudeBuff==='function') checkSolitudeBuff();
          }
          else if(tgt.who==='enemy') G.enemies[tgt.idx]=_newU;
          else if(tgt.who==='rew-char'){ _newU._isChar=true; _newU._buyPrice=_tdef.cost||2; _rewCards[tgt.idx]=_newU; }
          log(`変身の短杖：${tu.name} → ${_newU.name}（G${_tg}）`,'good');
        } else {
          log(`変身の短杖：同グレードのキャラが存在しない`,'sys');
        }
      }
    break;}
    case 'ritual_scroll':{
      const srcIdx=tgt.idx;
      const srcU=tgt.who==='ally'?G.allies[srcIdx]:null;
      if(!srcU||srcU.hp<=0){ log('儀式の巻物：対象が無効','bad'); break; }
      const candidates=G.allies.map((a,i)=>({a,i})).filter(x=>x.a&&x.a.hp>0&&x.i!==srcIdx);
      if(!candidates.length){ log('儀式の巻物：移譲先の仲間がいない','bad'); break; }
      // 2段目ピッカーを renderAll 後に起動
      _spreadPick=()=>{
        _spreadPick=null;
        clearSelectable();
        setHint(`儀式の巻物：${srcU.name}のキーワード移譲先を選択（右クリックでキャンセル）`);
        const _finishPick=()=>{
          // 全ての選択状態とキャンセルリスナーを除去
          clearSelectable();
          document.removeEventListener('keydown',_cancelPickKD);
          document.removeEventListener('contextmenu',_cancelPickCM);
        };
        const slots=_getAllyDomSlots();
        candidates.forEach(cand=>{
          const slot=slots[cand.i];
          if(!slot) return;
          slot.classList.add('selectable');
          slot.onclick=()=>{
            _finishPick();
            const _srcKws=[...(srcU.keywords||[])];
            const _dstKws=cand.a.keywords||[];
            const _newKws=[..._dstKws];
            _srcKws.forEach(k=>{ if(!_newKws.includes(k)) _newKws.push(k); });
            cand.a.keywords=_newKws;
            if(_srcKws.includes('反撃')) cand.a.counter=true;
            srcU.hp=0;
            if(typeof processAllyDeath==='function') processAllyDeath(srcU);
            G.allies[srcIdx]=null;
            log(`儀式の巻物：${srcU.name}を破壊→${cand.a.name}にキーワード移譲（${_srcKws.join('、')||'なし'}）`,'good');
            renderAll();
            finishTargetSelection();
          };
        });
        _addCancelListeners();
      };
    break;}
    case 'meteor':{
      log('☄ 隕石の杖：全キャラに1ダメ','bad');
      if(_inReward){
        _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,1); });
      } else {
        G.enemies.forEach((e,i)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,1,i); });
      }
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0) dealDmgToAlly(a,1,ai,null); });
    break;}
    case 'meteor_multi':{
      const ml=G.magicLevel||1;
      const _hits=ml*cMult;
      if(_inReward){
        log(`☄ 隕石の杖：ランダムな報酬キャラに${ml}ダメ×${_hits}回`,'good');
        for(let _mi=0;_mi<_hits;_mi++){
          const liveR=_rewCards.map((c,ri)=>({c,ri})).filter(({c})=>c&&c._isChar&&c.hp>0);
          if(!liveR.length) break;
          const {ri}=randFrom(liveR);
          dealDmgToRewChar(ri,ml);
        }
      } else {
        log(`☄ 隕石の杖：ランダムな敵に${ml}ダメ×${_hits}回`,'good');
        for(let _mi=0;_mi<_hits;_mi++){
          const liveE=G.enemies.filter(e=>e&&e.hp>0);
          if(!liveE.length) break;
          const mt=randFrom(liveE);
          dealDmgToEnemy(mt,ml,G.enemies.indexOf(mt));
        }
      }
    break;}
    case 'shield_wand':{
      const sw=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx];
      if(sw){ sw.shield=(sw.shield||0)+1; log(`光輝の杖：${sw.name}にシールドを付与`,'good'); }
    break;}
    case 'growth_wand':{
      const gwA=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx];
      if(gwA&&gwA.hp>0){
        if(!gwA.keywords) gwA.keywords=[];
        const gwV=(G.magicLevel||1)*cMult;
        const gwI=gwA.keywords.findIndex(k=>/^成長\d+$/.test(k));
        if(gwI>=0){ const _v=parseInt(gwA.keywords[gwI].slice(2)); gwA.keywords[gwI]=`成長${_v+gwV}`; }
        else gwA.keywords.push(`成長${gwV}`);
        log(`成長の杖：${gwA.name}に成長${gwV}を付与`,'good');
      }
    break;}
    case 'bomb':{ const dmg=(_inReward?(_rewCards.find(c=>c&&c._isChar)?.grade||1):(G.enemies[0]?.grade||1))*5*cMult;
      if(_inReward){ log(`全体爆弾 全報酬キャラに${dmg}ダメ`+(cMult>1?' [×2]':''),'bad'); _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,dmg); }); }
      else { log(`全体爆弾 全敵に${dmg}ダメ`+(cMult>1?' [×2]':''),'bad'); G.enemies.forEach((e,i)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dmg,i); }); }
    break;}
    case 'revive':{ if(G.lastDead){ const c=clone(G.lastDead); c.hp=Math.min(Math.floor(c.maxHp*.5*cMult),c.maxHp); c.id=uid(); const s=G.allies.findIndex(a=>!a||a.hp<=0); if(s>=0) G.allies[s]=c; else if(G.allies.length<6) G.allies.push(c); log(`${c.name} 復活！`+(cMult>1?' [HP×2]':''),'good'); } else log('復活対象なし'); break;}
    case 'big_rally':{ const rbonus=2*cMult; let _rbShown=rbonus; G.allies.forEach(a=>{ if(a&&a.hp>0) _rbShown=addUnitHp(a,rbonus); }); log(`鼓舞の巻物：全仲間HP+${_rbShown}！`+(cMult>1?' [×2]':''),'good'); break;}
    case 'reiki_herb':{
      const _ru=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='enemy'?G.enemies[tgt.idx]:(tgt.who==='rew-char'?_rewCards[tgt.idx]:null);
      if(_ru&&_ru.hp>0){
        const _side=tgt.who==='rew-char'?'ally':undefined;
        const _rv=addUnitHp(_ru,4,_side);
        log(`治癒の薬：${_ru.name}に±0/+${_rv}`,'good');
        if(!_inReward) triggerDryadBuff();
      }
    break;}
    case 'gold_8':{ G.gold+=8*cMult; log(`ソウル+${8*cMult}`+(cMult>1?' [×2]':''),'gold'); break;}
    case 'soul_dregs':{
      // G4以下の契約を1つ選んでグレードを次の戦闘終了まで+1
      const eligible=G.rings.filter(r=>r&&(r.grade||1)<MAX_GRADE);
      if(!eligible.length){ log('魂の残滓：グレードを上げられる契約がない','sys'); break; }
      if(eligible.length===1){
        eligible[0].grade++;
        eligible[0]._tempGrade=true;
        log(`💀 魂の残滓：${eligible[0].name} グレード+1（次の戦闘終了まで）`,'good');
      } else {
        // 複数ある場合は選択UI（arcana-pick-overlayを再利用）
        _arcanaPickTarget('魂の残滓', eligible.map(r=>({...r,_isRing:true})), (target)=>{
          const ring=G.rings.find(r=>r&&r.id===target.id);
          if(ring){ ring.grade++; ring._tempGrade=true; log(`💀 魂の残滓：${ring.name} グレード+1（次の戦闘終了まで）`,'good'); }
        });
      }
    break;}
    case 'soul_income':{ G._soulIncomeBonus=(G._soulIncomeBonus||0)+1; log(`魔神の秘薬：戦闘終了時ソウル獲得+1（現在+${G._soulIncomeBonus}）`,'good'); break;}
    case 'bonus_action_herb':{ G._bonusAction=(G._bonusAction||0)+1; G.actionsPerTurn=calcActions(); log(`聖王の秘薬：行動回数+1（現在${G.actionsPerTurn}行動/ターン）`,'good'); break;}
    case 'shield_ally':{ const a=G.allies[tgt.idx]; if(a){ if(!a.shield) a.shield=1; log(`🛡 ${a.name}にシールドを付与`,'good'); } break;}
    case 'copy_scroll':{
      const _cwSrc=(G.bossHand||[]).filter(s=>s&&s.type==='wand');
      if(!_cwSrc.length){ log('複製の巻物：敵の手札に杖がない','sys'); break; }
      if(G.spells.filter(s=>s).length>=(G.handSlots||5)){ log('手札が満杯','bad'); break; }
      const picked=randFrom(_cwSrc);
      const pw=clone(picked); pw.usesLeft=pw.baseUses||3; pw._maxUses=pw.usesLeft;
      for(let j=0;j<(G.handSlots||5);j++){ if(!G.spells[j]){ G.spells[j]=pw; break; } }
      log(`📜 複製の巻物：${pw.name} を入手`,'good');
    break;}
    case 'destroy_scroll':{
      const _dwSrc=(G.bossHand||[]).filter(s=>s);
      if(!_dwSrc.length){ log('破壊の巻物：敵の手札がない','sys'); break; }
      const dw=randFrom(_dwSrc);
      G.bossHand.splice(G.bossHand.indexOf(dw),1);
      G.gold+=3; updateHUD();
      const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
      log(`🔥 破壊の巻物：敵の「${dw.name}」を破壊してソウル+3`,'gold');
    break;}
    case 'flash_blade':{
      // 全キャラに1ダメージ（報酬フェイズ：仲間＋報酬キャラ、戦闘：仲間＋全敵）
      log('⚡ 閃刃の杖：全キャラに1ダメ','bad');
      const allyTargets=G.allies.map((a,ai)=>({a,ai})).filter(({a})=>a&&a.hp>0);
      allyTargets.forEach(({a,ai})=>{ if(a&&a.hp>0) dealDmgToAlly(a,1,ai,null); });
      if(_inReward){
        const rewTargets=_rewCards.map((c,ri)=>({c,ri})).filter(({c})=>c&&c._isChar&&c.hp>0);
        rewTargets.forEach(({c,ri})=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,1); });
      } else {
        const enemyTargets=G.enemies.map((e,ei)=>({e,ei})).filter(({e})=>e&&e.hp>0);
        enemyTargets.forEach(({e,ei})=>{ if(e&&e.hp>0) dealDmgToEnemy(e,1,ei); });
      }
    break;}
    case 'charm':{
      if(!tgt) break;
      const ml=G.magicLevel||1;
      if(tgt.who==='rew-char'){
        const rc=_rewCards[tgt.idx];
        if(!rc||!rc._isChar||rc.hp<=0) break;
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot<0){ log('魅了の杖：盤面が満杯','bad'); break; }
        const charmed=makeUnitFromDef(rc);
        G.allies[emptySlot]=charmed;
        _rewCards[tgt.idx]=null;
        log(`✨ 魅了の杖：${rc.name}(ATK${rc.atk}≤${ml})を仲間にした！`,'good');
        if(typeof squirrelSay==='function') squirrelSay('提示カードのコントロールを得た時');
        renderRewCards();
      } else if(tgt.who==='enemy'){
        const e=G.enemies[tgt.idx];
        if(!e||e.hp<=0) break;
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot<0){ log('魅了の杖：盤面が満杯','bad'); break; }
        // 憤激の指輪：敵が仲間になったらfury付与
        const _chFuryR=G.rings&&G.rings.find(r=>r&&r.unique==='fury_start');
        if(_chFuryR){ const _fb=3*(_chFuryR.grade||1); e.atk+=_fb; e.baseAtk=(e.baseAtk||0)+_fb; e._furyAtk=_fb; }
        G.allies[emptySlot]=e;
        G.enemies[tgt.idx]=null;
        log(`✨ 魅了の杖：${e.name}(ATK${e.atk}≤${ml})を仲間にした！`,'good');
      }
    break;}
  }

  if(_isWandUse&&!_suppressWandTriggers){
    const extraCasts=(G.allies||[]).reduce((sum,a)=>{
      if(!a||a.hp<=0||a.effect!=='elvenmage_wand_double') return sum;
      return sum+(a._stackCount||0)+1+(G.hasGoldenDrop?1:0);
    },0);
    for(let i=0;i<extraCasts;i++){
      log(`エルヴンメイジ：${sp.name}の効果を追加発動`,'good');
      if(typeof onWandUsed==='function') onWandUsed();
      applySpell(sp,idx,tgt,true,true);
    }
  }

  if(sp.type==='consumable') G.spells[idx]=null;

  // 使用回数管理
  if(sp.type==='wand'){
    if(sp.usesLeft===undefined) sp.usesLeft=1; // fallback
    const manaCycle=G.rings.find(r=>r&&r.unique==='mana_cycle');
    let skipDecrement=false;
    // _noDecrement=true（拡散の内部呼び出し等）の場合はmana_cycleを消費しない
    if(!_noDecrement&&manaCycle&&!G._manaCycleUsed){ G._manaCycleUsed=true; skipDecrement=true; log(`魔導の指輪：最初の杖のチャージ消費をスキップ`,'sys'); }
    if(!_noDecrement&&!skipDecrement){
      sp.usesLeft--;
      if(sp.usesLeft<=0){
        log(`${sp.name}のチャージが切れた`,'sys');
        // アラクネ：杖が壊れた時、魔術レベル+1
        if(G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='arachne_wand')){
          if(typeof onMagicLevelUp==='function') onMagicLevelUp(1+(G.hasGoldenDrop?1:0));
        }
        G.spells[idx]=null;
      }
    }
  }

  if(!_spreadTargetPending&&!_suppressWandTriggers){
    if(_inMap){
      if(typeof _consumeWorldMapTurn==='function'&&!_consumeWorldMapTurn()) return;
    } else if(sp.type==='consumable'&&canUseGremlinFreeItem(sp)){
      G._freeItemUsed=true;
      log('グレムリン：このフェイズ最初のアイテムは行動力を消費しない','good');
    } else {
      G.actionsLeft--;
    }
    if(G._debugMode) G.actionsLeft=G.actionsPerTurn;
    if(!_inMap&&!_inReward&&G.phase==='player'&&typeof finishSelectedAllyAction==='function'){
      finishSelectedAllyAction();
    }
  }
  // ヘルハウンド：アイテム（消耗品）使用時のみランダムな敵/提示カードを攻撃（杖は対象外）
  if(sp.type==='consumable'){
    if(!_inMap){
      G.allies.forEach(hh=>{
        if(!hh||hh.hp<=0||hh.effect!=='hellhound_spell') return;
        if(_inReward){
          // 報酬フェイズ：ランダムな提示キャラに攻撃
          const _liveR=_rewCards.map((c,ri)=>({c,ri})).filter(({c})=>c&&c._isChar&&c.hp>0);
          if(!_liveR.length) return;
          const {c:_rht,ri:_rhi}=randFrom(_liveR);
          dealDmgToRewChar(_rhi,hh.atk);
          log(`${hh.name}：アイテム使用→${_rht.name}に${hh.atk}ダメ`,'good');
        } else {
          const _liveE=G.enemies.filter(e=>e&&e.hp>0);
          if(!_liveE.length) return;
          const _ht=randFrom(_liveE);
          dealDmgToEnemy(_ht,hh.atk,G.enemies.indexOf(_ht),hh);
          log(`${hh.name}：アイテム使用→${_ht.name}に${hh.atk}ダメ`,'good');
        }
        // ウンディーネ：ヘルハウンドの効果攻撃にも適用
        const _hhGd=G.hasGoldenDrop?1:0;
        if(G.allies.some(a=>a&&a.hp>0&&a.effect==='undine_passive')){
          const _uv=1+_hhGd; hh.atk+=_uv; hh.baseAtk=(hh.baseAtk||0)+_uv; hh.hp+=_uv; hh.maxHp+=_uv;
          log(`ウンディーネ：${hh.name}が+${_uv}/+${_uv}`,'good');
        }
      });
    }
    // ダークワン：アイテム使用時、全仲間の悪魔+1/+1
    { const _dkv=1+(G.hasGoldenDrop?1:0);
      let _dkTriggered=false;
      G.allies.forEach(dk=>{ if(dk&&dk.hp>0&&dk.effect==='darkone_spell'){ _dkTriggered=true; }});
      if(_dkTriggered){ G.allies.forEach(a=>{ if(a&&a.hp>0&&unitMatchesRace(a,'悪魔')){ a.atk+=_dkv; a.baseAtk=(a.baseAtk||0)+_dkv; a.hp+=_dkv; a.maxHp+=_dkv; }}); log(`ダークワン：アイテム使用→全仲間の悪魔+${_dkv}/+${_dkv}`,'good'); }
    }
  }
  syncHarpyAtk(); // magic_book等で魔術レベルが変化した場合にATKを更新
  renderAll();
  if(_inMap){
    if(typeof showWorldMap==='function') showWorldMap();
    setHint('移動先を選択してください');
    return;
  }
  if(!_inReward&&checkInstantVictory()) return;
  if(_inReward){
    // 報酬フェイズ：renderAll()が上書きした各UIを復元してから、必要なら拡散ピッカーを起動
    setHint('報酬を獲得してください');
    renderRewCards();
    renderFieldEditor();      // f-ally還魂ボタン＋hand-slots廃棄ボタンを復元
    renderMoveSlotsInEnemy(); // f-enemyの移動マスを復元
    if(_spreadPick) _spreadPick(); // 拡散対象選択：報酬UI復元後に起動
    return;
  }
  if(_spreadPick){ _spreadPick(); return; } // 拡散対象選択：renderAll後にピッカー起動
  const hasUsable=G.spells.some(s=>s&&(s.type==='consumable'||((s.type==='wand'||s.type==='weapon')&&(s.usesLeft===undefined||s.usesLeft>0))));
  if(G.actionsLeft<=0&&!G._debugMode&&!canUseGremlinFreeItem()){
    setHint('行動終了。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else if(!hasUsable&&!G._debugMode){
    setHint('使用できる魔法がありません。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else {
    setHint('あと'+G.actionsLeft+'回行動できます');
  }
}

function canUseGremlinFreeItem(sp){
  const phase=G.phase==='reward'?'reward':'battle';
  if(G._freeItemPhase!==phase){
    G._freeItemPhase=phase;
    G._freeItemUsed=false;
  }
  if(G._freeItemUsed) return false;
  if(!G.allies.some(a=>a&&a.hp>0&&a.effect==='gremlin_free_item')) return false;
  if(sp) return sp.type==='consumable';
  return G.spells.some(s=>s&&s.type==='consumable');
}
