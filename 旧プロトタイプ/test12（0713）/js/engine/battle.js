// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, pool.js
// ═══════════════════════════════════════

let _isBossFight = false;

// 魔術レベル上昇時の共通処理
function onMagicLevelUp(amount){
  G.magicLevel=(G.magicLevel||1)+amount;
}

// ゴールド獲得時の共通処理
function onGoldGained(amount){
  G.gold+=amount; G.earnedGold+=amount;
  if(amount>0&&typeof playSfx==='function') playSfx('goldGain',{group:'reward'});
  updateHUD();
}

function _handleVictory(){
  // stale setTimeout が次の戦闘中に発火した場合は何もしない
  if(G.phase!=='reward') return;
  if(G._battleDefeatHandled) return;
  if(!(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul)) return;
  if(_checkRearCenterAllyGameOver()) return;
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showScreen('clear');
  } else {
    showVictoryOverlay();
    setTimeout(()=>{
      const ov=document.getElementById('victory-overlay');
      if(ov) ov.style.display='none';
      if(G.phase==='reward') goToReward();
    },800);
  }
}

// ── HP増加共通関数──────
// ATKを増加させる共通関数
function addUnitAtk(unit, amount){
  if(!unit||amount<=0) return 0;
  const total = amount;
  unit.atk += total;
  unit.baseAtk = (unit.baseAtk||0) + total;
  return total;
}

function addUnitHp(unit, amount, sideOverride){
  if(!unit||amount<=0) return 0;
  const total=amount;
  unit.hp+=total; unit.maxHp+=total;
  return total;
}

function snapshotAlliesAtBattleStart(){
  G._allyBattleStartSnapshot=(G.allies||[]).map(a=>a?clone(a):null);
  G._rewardBattleStateRestored=false;
}

function restoreAlliesForRewardTransition(){
  if(G._rewardBattleStateRestored) return;
  const snap=G._allyBattleStartSnapshot;
  if(!Array.isArray(snap)) return;
  G.allies=snap.map(a=>a?clone(a):null);
  G._rewardBattleStateRestored=true;
}

function unitMatchesRace(unit, race){
  if(!unit||!race) return false;
  const races=String(unit.race||'').split(/[／/、,，\s]+/).filter(Boolean);
  return race==='全て'||races.includes(race)||races.includes('全て');
}

function applyUnitBuff(unit, atk, hp, sideOverride){
  if(!unit||unit.hp<=0) return {atk:0,hp:0};
  const doneAtk=atk>0?atk:0;
  const doneHp=hp>0?hp:0;
  if(atk>0){
    unit.atk+=doneAtk;
    unit.baseAtk=(unit.baseAtk||0)+doneAtk;
  }
  const hpDone=doneHp>0?addUnitHp(unit,doneHp,sideOverride):0;
  return {atk:doneAtk,hp:hpDone};
}

// ── 戦闘開始 ──────────────────────────────────

async function startBattle(){
  document.body.classList.remove('reward-screen-active');
  (G.spellSlots||[]).forEach(c=>{ if(c) delete c._firedThisBattle; });
  (G.allies||[]).forEach(u=>{
    (u?.equipment||[]).forEach(p=>{ if(p) delete p._rewardReturnCard; });
  });
  if(typeof setBattleStageBackground==='function') setBattleStageBackground();
  _updateLaneOffset();
  clearLog();

  updateGoldenDrop();
  if(typeof syncUnitPanelStatBonuses==='function') G.allies.forEach(a=>syncUnitPanelStatBonuses(a));
  G._masterHandReady=false;
  G._manaCycleUsed=false;
  G.mana={red:0,blue:0,green:0,yellow:0};
  G.allies.forEach(a=>{ if(a) delete a._deathProcessed; });
  G.enemies.forEach(e=>{ if(e) delete e._deathProcessed; });

  // フェイズを先行設定（報酬フェイズから遷移時、addAlly/renderAll 等が reward UI を誤操作しないよう）
  G.phase='player';
  G._showGlobalPanels=true;
  G._battleDefeatHandled=false;
  G._selectedEquipUnitIdx=-1;

  // 報酬フェイズUI非表示
  const rInfo=document.getElementById('reward-info-bar');
  const rCards=document.getElementById('reward-cards-section');
  const rHand=document.getElementById('inline-hand-editor');
  const rMove=document.getElementById('move-inline');
  const allySection=document.getElementById('ally-section');
  if(rInfo)  rInfo.style.display='none';
  if(rCards) rCards.style.display='none';
  if(rHand)  rHand.style.display='none';
  if(rMove)  rMove.style.display='none';
  if(allySection) allySection.style.display='';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display='';
  const eArea=document.getElementById('enemy-area');
  if(eArea) eArea.style.display='';
  const rMoveBtns=document.getElementById('reward-move-btns');
  if(rMoveBtns) rMoveBtns.style.display='none';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='';

  const fd=FLOOR_DATA[G.floor];
  _isBossFight=!!(fd&&fd.boss);

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G.battleCounters={damage:0,deaths:0};

  G.enemies=generateEnemies(G.floor);
  // 敵は前衛5体・後衛3体の最大8枠へ整列。オブジェクトは出現させない。
  {
    const _actualEnemies=G.enemies.filter(e=>e&&!e._isObject);
    while(_actualEnemies.length<4&&_actualEnemies.length>0){
      const base=_actualEnemies[_actualEnemies.length%_actualEnemies.length]||_actualEnemies[0];
      const extra=JSON.parse(JSON.stringify(base));
      extra.id=uid();
      extra.lane='front';
      _actualEnemies.push(extra);
    }
    const _newEnemies=new Array(MAX_ENEMIES||8).fill(null);
    if(!_isBossFight) _layoutEnemyLanes(_actualEnemies);
    _actualEnemies.forEach((e,idx)=>{ if(idx<_newEnemies.length) _newEnemies[idx]=e; });
    G.enemies=_newEnemies;
    compactBattleUnits();
    if(_isBossFight) G._bossSlot=G.enemies.findIndex(e=>e&&(e.boss||(e.keywords||[]).includes('ボス')));
    // エリートの位置を再特定（撃破ボーナス判定で参照するため）
    if(G._isEliteFight) G._eliteIdx=G.enemies.findIndex(e=>e&&e.keywords&&e.keywords.includes('エリート'));
  }
  G.enemies.forEach(e=>{
    if(!e) return;
    if(e._isObject) return;
    e.allyTarget=false;
  });
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    a._dp=false; a.powerBroken=false;
    a.nullified=0; a.instadead=false;
    a._battleStartHp=a.hp;
    const hasBattleHate=(a._panelSummoned&&a.guardian)||(a._panelSummoned&&(a.keywords||[]).includes('守護'));
    if(hasBattleHate){ a.hate=true; a.hateTurns=99; }
    else { a.hate=false; a.hateTurns=0; }
    delete a._weakenedSavedAtk; delete a._weakenPhaseApplied;
  });
  snapshotAlliesAtBattleStart();
  if(_isBossFight){
    const _bossUnit=G.enemies[G._bossSlot];
    log(`${_lc(_bossUnit?.name||'ボス',true)} が現れた！`,'bad');
  }
  log(`${G.enemies.filter(e=>e&&!e._isObject).length}体の敵が現れた。`,'em');

  // 戦闘開始時キャラクター効果
  onBattleStart();
  if(typeof applyNewPanelBattleStart==='function') applyNewPanelBattleStart();

  updateHUD();
  renderAll();
  // 開幕効果で全敵が倒された場合、勝利判定
  if(checkInstantVictory()) return;
  requestAnimationFrame(_updateLaneOffset); // スロット描画後にオフセット再計算
  await nextTurn();
}

// ── ターンループ ───────────────────────────────

async function nextTurn(){
  G.turn++;
  updateHUD();
  startPlayerPhase();
}

// ── ターン開始（行動回数リセット・ステータス同期）──────

function startPlayerPhase(){
  G.phase='player';
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G.spreadActive=false;
  // 毒処理後も仲間が全滅していたらゲームオーバー
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){ setTimeout(()=>handleBattleDefeat(),300); return; }
  renderAll();
  setHint('準備ができたら「戦闘実行」を押してください。');
}

// ── 戦闘フェイズ（インターリーブ攻撃）─────────────

async function battlePhase(){
  G.phase='enemy';
  renderControls();
  log(`戦闘開始！`,'sys');

  let safety=0;
  let side='enemy';
  let enemyCursor=0;
  let allyCursor=0;
  while(!_checkBattleOver()&&safety++<500){
    if(_nextLiveBattleIndex(G.enemies,0,true)<0&&_nextLiveBattleIndex(G.allies,0,false)<0){
      G._battleDraw=true;
      log('戦いは引き分けになった。','sys');
      G.phase='reward';
      renderAll();
      setTimeout(()=>{ if(G.phase==='reward') goToReward(); },400);
      return;
    }
    if(side==='enemy'){
      let ei=_nextLiveBattleIndex(G.enemies,enemyCursor,true);
      if(ei<0){
        side='ally';
        continue;
      }
      const enemy=G.enemies[ei];
      await enemyAttackAction(enemy,ei);
      compactBattleUnits();
      const newEi=G.enemies.indexOf(enemy);
      enemyCursor=newEi>=0?newEi+1:ei;
      if(_checkBattleOver()) return;
      side='ally';
    } else {
      let ai=_nextLiveBattleIndex(G.allies,allyCursor,false);
      if(ai<0){
        side='enemy';
        continue;
      }
      const ally=G.allies[ai];
      await allyAttackAction(ally,ai);
      compactBattleUnits();
      const newAi=G.allies.indexOf(ally);
      allyCursor=newAi>=0?newAi+1:ai;
      if(_checkBattleOver()) return;
      side='enemy';
      G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });
    }
  }
  if(safety>=500){
    log('戦闘が長引いたため停止しました','sys');
  }
  renderAll();
}

function _nextLiveBattleIndex(arr,start,isEnemy){
  const max=isEnemy?(MAX_ENEMIES||8):(MAX_ALLIES||5);
  const hasLiveFront=(arr||[]).some(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul&&(u.lane||'front')==='front');
  for(let step=0;step<max;step++){
    const i=(start+step)%max;
    const u=arr[i];
    if(!u||u.hp<=0) continue;
    if(isEnemy&&u._isObject) continue;
    if(!isEnemy&&(u._isSoul||u._isObject)) continue;
    if(hasLiveFront&&(u.lane||'front')==='rear') continue;
    const atkVal=isEnemy?(u.nullified>0?0:(u.atk||0)):_attackDamageValue(u);
    if((atkVal||0)<=0) continue;
    return i;
  }
  return -1;
}

function clampUnitStats(unit){
  if(!unit) return unit;
  unit.atk=Math.max(0,Number(unit.atk)||0);
  unit.baseAtk=Math.max(0,Number(unit.baseAtk??unit.atk)||0);
  unit.maxHp=Math.max(0,Number(unit.maxHp??unit.hp)||0);
  unit.hp=Math.max(0,Math.min(unit.maxHp,Number(unit.hp)||0));
  return unit;
}

function _battleLogName(unit,list){
  if(!unit) return '';
  const name=unit.name||'';
  const same=(list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul&&(u.name||'')===name);
  if(same.length<=1) return name;
  const idx=same.indexOf(unit);
  const suffix=String.fromCharCode(65+Math.max(0,idx));
  return `${name}（${suffix}）`;
}

function _layoutEnemyLanes(enemies){
  const live=(enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject);
  if(!live.length) return enemies;
  let rear=live.filter(e=>(e.lane||'front')==='rear');
  let front=live.filter(e=>(e.lane||'front')!=='rear');
  if(rear.length<1&&front.length>1) rear.push(front.pop());
  while(front.length<Math.min(3,live.length-1)&&rear.length>1) front.push(rear.shift());
  while(rear.length>(ENEMY_REAR_SLOTS||5)) front.push(rear.shift());
  while(rear.length>front.length&&rear.length>1) front.push(rear.shift());
  front=front.slice(0,ENEMY_FRONT_SLOTS||7);
  rear=rear.slice(0,ENEMY_REAR_SLOTS||7);
  if(front.length>0&&rear.length<1&&live.length>1) rear.push(front.pop());
  while(front.length<Math.min(3,live.length-1)&&rear.length>1) front.push(rear.shift());
  while(rear.length>front.length&&rear.length>1) front.push(rear.shift());
  front.forEach(e=>{ e.lane='front'; });
  rear.forEach(e=>{ e.lane='rear'; });
  enemies.length=0;
  front.forEach(e=>enemies.push(e));
  rear.forEach(e=>enemies.push(e));
  return enemies;
}

function compactBattleUnits(){
  const maxA=MAX_ALLIES||10;
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  const nextAllies=new Array(maxA).fill(null);
  const liveAllies=(G.allies||[]).filter(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
  liveAllies.forEach(clampUnitStats);
  const allyFront=liveAllies.filter(a=>(a.lane||'front')!=='rear');
  const allyRear=liveAllies.filter(a=>(a.lane||'front')==='rear');
  _placeCenteredRow(nextAllies,allyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextAllies,allyRear.slice(0,maxA-frontSlots),frontSlots,maxA-frontSlots,'rear');
  G.allies=nextAllies;
  const maxE=MAX_ENEMIES||10;
  const nextEnemies=new Array(maxE).fill(null);
  const liveEnemies=(G.enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject);
  liveEnemies.forEach(clampUnitStats);
  const enemyFront=liveEnemies.filter(e=>(e.lane||'front')!=='rear');
  const enemyRear=liveEnemies.filter(e=>(e.lane||'front')==='rear');
  _placeCenteredRow(nextEnemies,enemyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextEnemies,enemyRear.slice(0,maxE-frontSlots),frontSlots,maxE-frontSlots,'rear');
  G.enemies=nextEnemies;
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');
}

function _placeCenteredRow(dest, units, offset, slots, lane){
  const start=Math.max(0,Math.floor((slots-units.length)/2));
  units.forEach((u,i)=>{
    if(!u) return;
    const pos=offset+start+i;
    if(pos<offset||pos>=offset+slots||pos>=dest.length) return;
    u.lane=lane;
    dest[pos]=u;
  });
}

function compactBattleUnitsAfterDeath(){
  if(G._isSimulating||G._compactingAfterDeath||G._deferBattleCompact) return;
  G._compactingAfterDeath=true;
  requestBattleCompact();
  G._compactingAfterDeath=false;
  _checkRearCenterAllyGameOver();
}

function _beginDeathCompactDelay(){
  G._deferBattleCompact=(G._deferBattleCompact||0)+1;
}

function _endDeathCompactDelay(){
  G._deferBattleCompact=Math.max(0,(G._deferBattleCompact||0)-1);
  if(!G._deferBattleCompact) compactBattleUnitsAfterDeath();
}

// 攻撃モーション（接触攻撃＋反撃を含む一連の演出）が完全に終了するまで、
// 盤面詰め直し・renderAll()を遅延させるためのロック。
// _dealAttackDamageWithMutual()/_dealMultiAttackDamageWithMutual()の実行区間全体を
// beginBattleMotion()/endBattleMotion()で囲むことで、演出中にDOMが再構築されて
// （visibility:hiddenにした元要素が古いDOM参照になり）ユニットが一瞬消える事象を防ぐ。
function beginBattleMotion(){
  G._battleMotionDepth=(G._battleMotionDepth||0)+1;
}

function endBattleMotion(){
  G._battleMotionDepth=Math.max(0,(G._battleMotionDepth||0)-1);
  if(!G._battleMotionDepth&&G._pendingBattleCompact){
    G._pendingBattleCompact=false;
    compactBattleUnits();
    if(typeof renderAll==='function') renderAll();
  }
}

function requestBattleCompact(){
  if(G._battleMotionDepth>0){
    G._pendingBattleCompact=true;
    return;
  }
  compactBattleUnits();
  if(typeof renderAll==='function') renderAll();
}

function _delayDeathCompact(ms){
  // タイマーでの詰め直しは、VFX中に位置が変わる原因になる。
  // 死亡確定と詰め直しは applyDamageBatch() 完了時に行う。
}

function _checkBattleOver(){
  if(_checkRearCenterAllyGameOver()) return true;
  if(G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul).length){ setTimeout(()=>handleBattleDefeat(),200); return true; }
  return false;
}

function handleBattleDefeat(){
  if(G._battleDefeatHandled) return;
  G._battleDefeatHandled=true;
  gameOver();
}

function _checkRearCenterAllyGameOver(){
  if(G._isSimulating||G._battleDefeatHandled) return false;
  if(G.phase!=='player'&&G.phase!=='enemy') return false;
  const hasRearAlly=(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&(a.lane||'front')==='rear');
  if(hasRearAlly) return false;
  log('後列中央が空になった','bad');
  handleBattleDefeat();
  return true;
}

function _onAllEnemiesDefeated(){
  if(G.phase==='reward') return; // 二重呼び出し防止
  if(!(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul)){
    handleBattleDefeat();
    return;
  }
  if(_checkRearCenterAllyGameOver()) return;
  log('敵を全滅させた！','gold');
  if(_isBossFight) G._bossJustDefeated=true;
  applyVictoryBonuses();
  updateHUD(); renderAll();
  G.phase='reward';
  setTimeout(()=>_handleVictory(),600);
}

// ── 味方攻撃アクション ──────────────────────────

async function _applyUnitAttackEffects(unit,isEnemySide){
  if(!unit||unit.hp<=0) return;
  const allies=isEnemySide?G.enemies:G.allies;
  const foes=isEnemySide?G.allies:G.enemies;
  const desc=String(unit.desc||'');
  if(/全ての仲間のHPが\+1/.test(desc)){
    allies.forEach(a=>{
      if(a&&a.hp>0&&!a._isObject&&!a._isSoul){
        a.hp=(a.hp||0)+1;
        a.maxHp=(a.maxHp||0)+1;
      }
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての仲間のHPが+1された。`,isEnemySide?'bad':'good');
  }
  if(/全ての敵に1ダメージ/.test(desc)){
    const entries=foes
      .filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul)
      .map(t=>({unit:t,side:isEnemySide?'ally':'enemy',amount:1,source:unit}));
    await applyDamageBatch(entries,{source:unit});
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての敵に1ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  if(/全ての前衛の味方に1ダメージ/.test(desc)){
    const entries=allies
      .filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul&&(t.lane||'front')!=='rear')
      .map(t=>({unit:t,side:isEnemySide?'enemy':'ally',amount:1,source:unit}));
    await applyDamageBatch(entries,{source:unit});
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての前衛の味方に1ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  ['赤','青','緑','黄','茶'].forEach(color=>{
    const n=_unitKeywordCount(unit,`${color}強化`);
    for(let i=0;i<n;i++) _applyPermanentColorBuff(color,1,1,unit.name,isEnemySide);
  });
}

async function _applyAllyAttackEffects(ally){
  await _applyUnitAttackEffects(ally,false);
}

async function _applyEnemyAttackEffects(enemy){
  await _applyUnitAttackEffects(enemy,true);
}

async function _applyAllyAttackEffectsWithElf(ally){
  if(!ally||ally.hp<=0) return;
  await _applyAllyAttackEffects(ally);
}

async function _applyEnemyAttackEffectsWithElf(enemy){
  if(!enemy||enemy.hp<=0) return;
  await _applyEnemyAttackEffects(enemy);
}

function _attackRepeatCount(unit){
  const kws=_unitPanelKeywords(unit);
  if(kws.includes('三段攻撃')) return 3;
  if(kws.includes('二段攻撃')) return 2;
  return 1;
}

function _unitPanelKeywords(unit){
  const kws=[...(unit&&unit.keywords||[])];
  const unitText=[unit&&unit.desc,unit&&unit.effectText,unit&&unit.effect].filter(Boolean).join(' ');
  ['シールド','復活','根性','守護','ヘイト','二段攻撃','三段攻撃','三方向攻撃','全体攻撃','先制'].forEach(k=>{
    if(unitText.includes(k)) kws.push(k);
  });
  (unit&&Array.isArray(unit.equipment)?unit.equipment:[]).forEach(p=>{
    if(!p) return;
    if(String(p.category||'')==='キャラクター') return;
    const names=[...new Set([p.name,...(p.keywords||[]),...(p.adjacentKeywords||[])].filter(Boolean))];
    names.forEach(n=>{ if(n) kws.push(n); });
  });
  return kws;
}

function _unitHasKeyword(unit, kw){
  return _unitPanelKeywords(unit).includes(kw);
}

function _unitKeywordCount(unit, kw){
  if(!kw) return 0;
  return _unitPanelKeywords(unit).filter(k=>k===kw).length;
}

function _attackDamageValue(unit){
  let dmg=Math.max(0,unit&&unit.atk||0);
  if(_unitHasKeyword(unit,'狙撃')) dmg=Math.ceil(dmg*1.5);
  return dmg;
}

async function _applyAttackEffectsForSide(unit,isEnemySide){
  if(isEnemySide) await _applyEnemyAttackEffectsWithElf(unit);
  else await _applyAllyAttackEffectsWithElf(unit);
}

function _damageSideOf(unit){
  if((G.allies||[]).includes(unit)) return 'ally';
  if((G.enemies||[]).includes(unit)) return 'enemy';
  return '';
}

function _captureUnitDamageRect(unit, side){
  if(!unit||!side||typeof getCurrentUnitSlot!=='function') return null;
  const slot=getCurrentUnitSlot(side==='enemy'?'enemy':'ally',unit);
  if(!slot||typeof slot.getBoundingClientRect!=='function') return null;
  const rect=slot.getBoundingClientRect();
  if(!rect||!rect.width||!rect.height) return null;
  return {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
}

function _applyDamageState(unit, dmg, source, side){
  if(!unit||unit.hp<=0||!(dmg>0)) return {unit,side,actualDmg:0,died:false,blocked:false};
  if(unit.shield>0){
    unit.shield--;
    log(`${_lc(unit.name,side==='enemy')}のシールドがダメージを防いだ。`,'sys');
    if(side==='ally') onAllyShieldLost(unit);
    else onEnemyShieldLost(unit);
    return {unit,side,actualDmg:0,died:false,blocked:true};
  }
  const actualDmg=Math.max(0,dmg);
  unit.hp=Math.max(0,(unit.hp||0)-actualDmg);
  if(side==='enemy'&&actualDmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
  }
  if(actualDmg>0&&unit.hp>0){
    if(side==='ally'){
      if(unit.manaOnInjury) _gainMana(unit.manaOnInjury,1,unit.name);
      _checkDragonContractInjury(unit);
      _onAllyInjuredByPanel(unit);
    } else {
      _checkDragonContractInjury(unit);
    }
  }
  if(actualDmg>0&&source&&source.keywords&&source.keywords.length&&unit.hp>0){
    applyKeywordOnHit(source,unit,actualDmg);
  }
  if(side==='enemy'&&unit.instadead&&actualDmg>0) unit.hp=0;
  return {unit,side,actualDmg,died:unit.hp<=0,blocked:false};
}

async function applyDamageBatch(entries, options){
  const opt=options||{};
  const prepared=(entries||[])
    .filter(e=>e&&e.unit&&e.unit.hp>0&&e.amount>0)
    .map(e=>{
      const side=e.side||_damageSideOf(e.unit);
      return {...e,side,rect:e.rect||_captureUnitDamageRect(e.unit,side)};
    })
    .filter(e=>e.side);
  if(!prepared.length) return [];

  // 全対象のHP減少を先に確定する（この時点ではまだ死亡処理・盤面詰め直しを行わない）
  const results=prepared.map(e=>({
    ..._applyDamageState(e.unit,e.amount,e.source||opt.source,e.side),
    rect:e.rect
  }));

  // HP数値・HPバーだけを即座に更新する（フィールド全体を作り直すrenderAll()は使わない）
  results.forEach(r=>{
    if(r.actualDmg>0&&typeof updateUnitDamageUi==='function') updateUnitDamageUi(r.unit,r.side);
  });

  const damaged=results.filter(r=>r.actualDmg>0);
  if(damaged.length&&typeof playSfx==='function') playSfx('hitLight',{group:'combat'});
  await Promise.all(damaged.map(r=>{
    if(r.rect&&typeof playHitVfxAtRect==='function') return playHitVfxAtRect(r.rect,r.actualDmg,opt.vfxOptions||{});
    if(typeof playHitVfx==='function') return playHitVfx(r.side,r.unit,r.actualDmg,opt.vfxOptions||{});
    return Promise.resolve();
  }));

  // VFX終了後に死亡処理を行う。HP0のカード自体はここではまだ盤面から消さない
  // （消去・詰め直しはrequestBattleCompact()経由で、モーション全体が終わってから一度だけ行う）
  const deaths=results.filter(r=>r.unit&&r.unit.hp<=0);
  if(deaths.length){
    _beginDeathCompactDelay();
    try{
      for(const r of deaths){
        if(r.side==='enemy') await processEnemyDeath(r.unit,G.enemies.indexOf(r.unit));
        else await processAllyDeath(r.unit);
      }
    } finally {
      _endDeathCompactDelay();
    }
  }
  return results;
}

async function _consumeAttackEffectPause(unit,isEnemySide){
  if(!unit||!unit._attackEffectPending||unit.hp<=0) return;
  unit._attackEffectPending=false;
  await _applyAttackEffectsForSide(unit,isEnemySide);
}

function _isArassusPreDamageAttack(unit){
  if(!unit||unit.name!=='アラッサス'||!unit._attackEffectPending) return false;
  return /全ての敵に1ダメージ/.test(String(unit.desc||unit.effectText||unit.effect||''));
}

async function _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage){
  const result={
    contacted:false,
    targetDiedBeforeContact:false,
    attackerDiedBeforeContact:false,
    actualTarget:target
  };
  if(!attacker||attacker.hp<=0){
    result.attackerDiedBeforeContact=true;
    return result;
  }
  if(!target||target.hp<=0){
    result.targetDiedBeforeContact=true;
    return result;
  }
  if(damage>0&&typeof playSfx==='function'){
    playSfx('attackLight',{group:'combat',guardKey:'combat:attack'});
  }
  if(isEnemySide){
    let actualTarget=target;
    let actualIdx=targetIdx;
    if(damage>0){
      actualTarget=_redirectToBodyguard(G.allies,target,'good');
      actualIdx=G.allies.indexOf(actualTarget);
    }
    result.actualTarget=actualTarget;
    if(damage>0&&_isArassusPreDamageAttack(attacker)&&typeof playArassusAttackMotion==='function'){
      await playArassusAttackMotion(attacker,actualTarget,true,async()=>{
        await _consumeAttackEffectPause(attacker,true);
        result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
        result.targetDiedBeforeContact=!actualTarget||actualTarget.hp<=0;
        return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
      });
      if(result.attackerDiedBeforeContact||result.targetDiedBeforeContact) return result;
    } else if(damage>0&&typeof playAttackMotion==='function'){
      await playAttackMotion(attacker,actualTarget,true);
      await _consumeAttackEffectPause(attacker,true);
    } else {
      await _consumeAttackEffectPause(attacker,true);
    }
    if(!attacker||attacker.hp<=0){
      result.attackerDiedBeforeContact=true;
      return result;
    }
    if(!actualTarget||actualTarget.hp<=0){
      result.targetDiedBeforeContact=true;
      return result;
    }
    // ダメージの実適用はここでは行わない。反撃と同じ接触として_dealAttackDamageWithMutual側で
    // まとめてapplyDamageBatch()に渡すことで、防御側の死亡確定より前に反撃の可否を確定できるようにする。
    result.contacted=damage>0;
    return result;
  }
  result.actualTarget=target;
  if(damage>0&&_isArassusPreDamageAttack(attacker)&&typeof playArassusAttackMotion==='function'){
    await playArassusAttackMotion(attacker,target,false,async()=>{
      await _consumeAttackEffectPause(attacker,false);
      result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
      result.targetDiedBeforeContact=!target||target.hp<=0;
      return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
    });
    if(result.attackerDiedBeforeContact||result.targetDiedBeforeContact) return result;
  } else if(damage>0&&typeof playAttackMotion==='function'){
    await playAttackMotion(attacker,target,false);
    await _consumeAttackEffectPause(attacker,false);
  } else {
    await _consumeAttackEffectPause(attacker,false);
  }
  if(!attacker||attacker.hp<=0){
    result.attackerDiedBeforeContact=true;
    return result;
  }
  if(!target||target.hp<=0){
    result.targetDiedBeforeContact=true;
    return result;
  }
  // ダメージの実適用はここでは行わない。反撃と同じ接触として_dealAttackDamageWithMutual側で
  // まとめてapplyDamageBatch()に渡すことで、防御側の死亡確定より前に反撃の可否を確定できるようにする。
  result.contacted=damage>0;
  return result;
}

async function _dealCounterDamage(attacker,defender,isEnemySide,amount){
  if(!(amount>0)) return;
  if(isEnemySide){
    await applyDamageBatch([{unit:attacker,side:'enemy',amount,source:defender}]);
  } else {
    await applyDamageBatch([{unit:attacker,side:'ally',amount,source:defender}]);
  }
  const defenderList=isEnemySide?G.allies:G.enemies;
  const attackerList=isEnemySide?G.enemies:G.allies;
  log(`${_lc(_battleLogName(defender,defenderList),!isEnemySide)}が${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${amount}ダメージを与えた。`,isEnemySide?'good':'bad');
}

async function _dealAttackDamageWithMutual(attacker,isEnemySide,target,targetIdx,damage){
  if(!attacker||!target) return null;
  // 接触攻撃＋反撃を含む一連の演出が完全に終わるまで、盤面詰め直し・renderAll()を遅延させる
  beginBattleMotion();
  try{
    await _applyPoisonBeforeAttack(attacker);
    if(attacker.hp<=0) return null;
    // 先制：相手（防御側）がこのキーワードを持つ場合、防御側の反撃を先に処理する。
    // これで攻撃側を倒せた場合、攻撃側の本来の攻撃は発生しない。
    const defenderFirstStrike=_unitHasKeyword(target,'先制')&&!_unitHasKeyword(attacker,'先制');
    if(defenderFirstStrike){
      await _dealCounterDamage(attacker,target,isEnemySide,Math.max(0,target.atk||0));
      if(attacker.hp<=0) return {contacted:false,attackerDiedBeforeContact:true,actualTarget:target};
    }
    const attackResult=await _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage);
    const defender=attackResult?.actualTarget||target;
    if(!attackResult?.contacted||attacker.hp<=0||!defender||defender.hp<=0){
      return attackResult;
    }
    // 攻撃・反撃を「同じ接触で同時に成立する相互ダメージ」として扱う。反撃の可否・値は
    // ダメージ適用前（接触直前）の状態でスナップショットし、攻撃で倒れたことを理由に反撃を
    // 取り消さない（先制で仕留めた場合のみ例外的に反撃を免除する）。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制');
    const willKillDefender=damage>0&&damage>=Math.max(0,defender.hp||0);
    const suppressCounterByFirstStrike=attackerHasFirstStrike&&willKillDefender;
    const counterAmount=Math.max(0,defender.atk||0);
    const defenderSide=isEnemySide?'ally':'enemy';
    const attackerSide=isEnemySide?'enemy':'ally';
    const entries=[{unit:defender,side:defenderSide,amount:damage,source:attacker}];
    if(!suppressCounterByFirstStrike&&counterAmount>0){
      entries.push({unit:attacker,side:attackerSide,amount:counterAmount,source:defender});
    }
    await applyDamageBatch(entries);
    if(!suppressCounterByFirstStrike&&counterAmount>0){
      const defenderList=isEnemySide?G.allies:G.enemies;
      const attackerList=isEnemySide?G.enemies:G.allies;
      log(`${_lc(_battleLogName(defender,defenderList),!isEnemySide)}が${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
    }
    return attackResult;
  } finally {
    endBattleMotion();
  }
}

async function _dealMultiAttackDamageWithMutual(attacker,isEnemySide,primaryTarget,targets,damage){
  if(!attacker||attacker.hp<=0||!primaryTarget||primaryTarget.hp<=0) return null;
  // 接触攻撃＋反撃を含む一連の演出が完全に終わるまで、盤面詰め直し・renderAll()を遅延させる
  beginBattleMotion();
  try{
    await _applyPoisonBeforeAttack(attacker);
    if(attacker.hp<=0) return null;
    const defenderFirstStrike=_unitHasKeyword(primaryTarget,'先制')&&!_unitHasKeyword(attacker,'先制');
    if(defenderFirstStrike){
      await _dealCounterDamage(attacker,primaryTarget,isEnemySide,Math.max(0,primaryTarget.atk||0));
      if(attacker.hp<=0) return {contacted:false,attackerDiedBeforeContact:true,actualTarget:primaryTarget};
    }

    const result={contacted:false,targetDiedBeforeContact:false,attackerDiedBeforeContact:false,actualTarget:primaryTarget};
    if(damage>0&&typeof playSfx==='function') playSfx('attackLight',{group:'combat',guardKey:'combat:attack'});
    if(damage>0&&_isArassusPreDamageAttack(attacker)&&typeof playArassusAttackMotion==='function'){
      await playArassusAttackMotion(attacker,primaryTarget,isEnemySide,async()=>{
        await _consumeAttackEffectPause(attacker,isEnemySide);
        result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
        result.targetDiedBeforeContact=!primaryTarget||primaryTarget.hp<=0;
        return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
      });
      if(result.attackerDiedBeforeContact||result.targetDiedBeforeContact) return result;
    } else if(damage>0&&typeof playAttackMotion==='function'){
      await playAttackMotion(attacker,primaryTarget,isEnemySide);
      await _consumeAttackEffectPause(attacker,isEnemySide);
    } else {
      await _consumeAttackEffectPause(attacker,isEnemySide);
    }
    if(!attacker||attacker.hp<=0){
      result.attackerDiedBeforeContact=true;
      return result;
    }
    if(!primaryTarget||primaryTarget.hp<=0){
      result.targetDiedBeforeContact=true;
      return result;
    }

    // 接触直前（ダメージ適用前）に生存していた対象のみ攻撃対象とする
    const seen=new Set();
    const side=isEnemySide?'ally':'enemy';
    const liveTargets=(targets||[])
      .filter(t=>t&&t.hp>0&&!seen.has(t.id)&&!t._isObject&&!t._isSoul)
      .map(t=>{ seen.add(t.id); return t; });
    const entries=liveTargets.map(t=>({unit:t,side,amount:damage,source:attacker}));
    result.contacted=damage>0&&entries.length>0;

    // 反撃も「同じ接触で同時に成立する相互ダメージ」として扱う。各対象の反撃可否・値は
    // ダメージ適用前にスナップショットし、このヒットで倒れたことを理由に反撃を取り消さない
    // （先制で仕留めた対象のみ例外的にその対象分の反撃を免除する）。複数対象の反撃は
    // 合計値として攻撃者へ1回にまとめて適用する。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制');
    const counterContributors=defenderFirstStrike?[]:liveTargets.filter(t=>{
      const lethalToThis=damage>0&&damage>=Math.max(0,t.hp||0);
      return !(attackerHasFirstStrike&&lethalToThis);
    });
    const counterAmount=counterContributors.reduce((sum,t)=>sum+Math.max(0,t.atk||0),0);
    const attackerSide=isEnemySide?'enemy':'ally';
    if(counterAmount>0){
      entries.push({unit:attacker,side:attackerSide,amount:counterAmount,source:primaryTarget});
    }
    await applyDamageBatch(entries);
    if(counterAmount>0){
      const attackerList=isEnemySide?G.enemies:G.allies;
      log(`反撃で${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
    }
    return result;
  } finally {
    endBattleMotion();
  }
}

async function _applyPoisonBeforeAttack(unit){
  if(!unit||unit.hp<=0||!(unit.poison>0)) return;
  const dmg=unit.poison;
  const side=(G.enemies||[]).includes(unit)?'enemy':((G.allies||[]).includes(unit)?'ally':null);
  if(!side) return;
  log(`${_lc(unit.name,G.enemies.includes(unit))}が毒で${dmg}ダメージを受けた。`,G.enemies.includes(unit)?'bad':'good');
  await applyDamageBatch([{unit,side,amount:dmg,source:null}]);
}

// 全体攻撃：対象の陣営にいる限り常に前衛全員を狙う。前衛が全滅している場合のみ後衛全員を狙う。
function _targetsInSameAttackRow(target, list){
  if(!target) return [];
  const front=(list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul&&(u.lane||'front')!=='rear');
  if(front.length) return front;
  return (list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul&&(u.lane||'front')==='rear');
}

function _panelGridPos(idx){
  if(idx===0) return {x:0,y:0};
  if(idx>=1) return {x:((idx-1)%5)+1,y:Math.floor((idx-1)/5)};
  return {x:0,y:0};
}

function _isAdjacentPanelSlot(a,b){
  const pa=_panelGridPos(a), pb=_panelGridPos(b);
  return Math.abs(pa.x-pb.x)+Math.abs(pa.y-pb.y)===1;
}

function _panelName(panel){ return String(panel?.name||'').trim(); }

function _isEnhancementPanel(panel){
  const c=String(panel?.category||'');
  return c==='強化'||c==='エンチャント';
}

function _isCharacterPanel(panel){
  return String(panel?.category||'')==='キャラクター';
}

function _directionFromPanelToSlot(panelIdx, targetIdx){
  const p=_panelGridPos(panelIdx), t=_panelGridPos(targetIdx);
  const dx=t.x-p.x, dy=t.y-p.y;
  if(dx===0&&dy===-1) return 'up';
  if(dx===1&&dy===0) return 'right';
  if(dx===0&&dy===1) return 'down';
  if(dx===-1&&dy===0) return 'left';
  return '';
}

function _panelAllowsDirection(panel, dir){
  if(!_isEnhancementPanel(panel)) return false;
  if(!Array.isArray(panel.directions)||!panel.directions.length) return true;
  return panel.directions.includes(dir);
}

function _forEachUnitPanel(unit, fn){
  const eq=Array.isArray(unit?.equipment)?unit.equipment:[];
  eq.forEach((panel,idx)=>{ if(panel) fn(panel,idx); });
}

// 戦闘順序（並べ替え可能な独立した並び）：メイン置き場（装備欄）内での物理的な位置とは独立して保持する。
// パネルオブジェクトそのものへの参照で管理するため、装備欄側でスロット位置を入れ替えても影響を受けない。
function _syncUnitBattleOrder(unit){
  if(!unit) return [];
  const eq=Array.isArray(unit.equipment)?unit.equipment:[];
  const currentPanels=eq.filter((panel,idx)=>idx!==0&&panel&&String(panel.category||'')==='キャラクター'&&panel.name!=='魔術師');
  if(!Array.isArray(unit._battleOrder)) unit._battleOrder=[];
  unit._battleOrder=unit._battleOrder.filter(p=>currentPanels.includes(p));
  currentPanels.forEach(p=>{ if(!unit._battleOrder.includes(p)) unit._battleOrder.push(p); });
  return unit._battleOrder;
}

// 強化カードの各矢印について、実際に「つながっている」状態か（矢印を消してunite画像を表示すべきか）を判定する。
// 「つながっている」＝①矢印の先が本体(idx0)または召喚キャラクターパネルである（直接）、
// または②矢印の先が別の強化カードで、その強化カード側の矢印もこちらを向いている（相互）。
const _PANEL_DIR_DELTA={up:{dx:0,dy:-1},right:{dx:1,dy:0},down:{dx:0,dy:1},left:{dx:-1,dy:0}};
function _panelDirectionConnectivity(unit, idx){
  const connectivity={};
  const eq=Array.isArray(unit?.equipment)?unit.equipment:[];
  const panel=eq[idx];
  if(!panel||!Array.isArray(panel.directions)) return connectivity;
  const pos=_panelGridPos(idx);
  panel.directions.forEach(d=>{
    const delta=_PANEL_DIR_DELTA[d];
    if(!delta){ connectivity[d]='open'; return; }
    const targetPos={x:pos.x+delta.dx,y:pos.y+delta.dy};
    let targetIdx=-1;
    for(let i=0;i<eq.length;i++){
      const p=_panelGridPos(i);
      if(p.x===targetPos.x&&p.y===targetPos.y){ targetIdx=i; break; }
    }
    if(targetIdx<0){ connectivity[d]='open'; return; }
    const targetPanel=eq[targetIdx];
    if(targetIdx===0||(targetPanel&&_isCharacterPanel(targetPanel))){
      connectivity[d]='connected';
      return;
    }
    if(targetPanel&&_isEnhancementPanel(targetPanel)){
      const backDir=_directionFromPanelToSlot(targetIdx,idx);
      connectivity[d]=_panelAllowsDirection(targetPanel,backDir)?'connected':'open';
      return;
    }
    connectivity[d]='open';
  });
  return connectivity;
}

// 強化の連結ルール：
// ①キャラクターに隣接し、矢印がキャラクターを向いている強化カード（直接接続）
// ②①の強化カードに隣接し、かつ矢印が互いを向いている（相互）強化カード
// ※②以降も相互矢印が続く限り連鎖する
function _collectEnhancementPanelsForSlot(unit, slotIdx){
  const panels=Array.isArray(unit?.equipment)?unit.equipment:[];
  const result=[];
  const seen=new Set();
  const queue=[];
  panels.forEach((panel,idx)=>{
    if(idx===slotIdx||!panel||!_isEnhancementPanel(panel)) return;
    if(!_isAdjacentPanelSlot(slotIdx,idx)) return;
    if(!_panelAllowsDirection(panel,_directionFromPanelToSlot(idx,slotIdx))) return;
    seen.add(idx);
    queue.push(idx);
    result.push({panel,idx});
  });
  while(queue.length){
    const idx=queue.shift();
    const panel=panels[idx];
    panels.forEach((next,nIdx)=>{
      if(seen.has(nIdx)||nIdx===slotIdx||!next||!_isEnhancementPanel(next)) return;
      if(!_isAdjacentPanelSlot(idx,nIdx)) return;
      const mutual=_panelAllowsDirection(panel,_directionFromPanelToSlot(idx,nIdx))&&
        _panelAllowsDirection(next,_directionFromPanelToSlot(nIdx,idx));
      if(!mutual) return;
      seen.add(nIdx);
      queue.push(nIdx);
      result.push({panel:next,idx:nIdx});
    });
  }
  return result;
}

function _collectAdjacentEnhancements(unit, slotIdx){
  const enh={atk:0,hp:0,keywords:[]};
  _collectEnhancementPanelsForSlot(unit,slotIdx).forEach(({panel})=>{
    enh.atk+=panel.adjacentAtkBonus||0;
    enh.hp+=panel.adjacentHpBonus||0;
    (panel.adjacentKeywords||[]).forEach(k=>enh.keywords.push(k));
  });
  return enh;
}

function refreshUnitPanelEffects(unit){
  if(!unit||unit.hp<=0) return;
  _applyAdjacentPanelEnhancements(unit,_collectAdjacentEnhancements(unit,0));
}

function _clearAdjacentPanelEnhancements(unit){
  const prev=unit?._adjacentPanelEnhancements;
  if(!unit||!prev) return;
  if(prev.atk){
    unit.atk=Math.max(0,(unit.atk||0)-prev.atk);
    unit.baseAtk=Math.max(0,(unit.baseAtk||0)-prev.atk);
  }
  if(prev.hp){
    unit.maxHp=Math.max(0,(unit.maxHp||0)-prev.hp);
    unit.hp=Math.max(0,Math.min((unit.hp||0)-prev.hp,unit.maxHp));
  }
  if(prev.keywords&&prev.keywords.length){
    const removeCounts={};
    prev.keywords.forEach(k=>{ removeCounts[k]=(removeCounts[k]||0)+1; });
    unit.keywords=(unit.keywords||[]).filter(k=>{
      if(removeCounts[k]>0){ removeCounts[k]--; return false; }
      return true;
    });
  }
  delete unit._adjacentPanelEnhancements;
  delete unit._adjacentPanelSignature;
}

function _applyAdjacentPanelEnhancements(unit, enh){
  if(!unit||!enh) return;
  const sig=JSON.stringify({atk:enh.atk||0,hp:enh.hp||0,keywords:[...(enh.keywords||[])].sort()});
  if(unit._adjacentPanelSignature===sig) return;
  _clearAdjacentPanelEnhancements(unit);
  unit._adjacentPanelSignature=sig;
  unit._adjacentPanelEnhancements={atk:enh.atk||0,hp:enh.hp||0,keywords:[...(enh.keywords||[])]};
  if(enh.atk){
    unit.atk=(unit.atk||0)+enh.atk;
    unit.baseAtk=(unit.baseAtk||0)+enh.atk;
  }
  if(enh.hp){
    unit.hp=(unit.hp||0)+enh.hp;
    unit.maxHp=(unit.maxHp||0)+enh.hp;
  }
  if(enh.keywords&&enh.keywords.length){
    unit.keywords=[...(unit.keywords||[]),...enh.keywords];
  }
}

function _makePanelSummonUnit(spec, keywords){
  const atk=spec.atk||0, hp=spec.hp||1;
  const mergedKeywords=[...(spec.keywords||[]),...(keywords||[])];
  return {
    id:uid(),
    name:spec.name||'召喚',
    icon:spec.icon||'',
    race:spec.race||'召喚',
    desc:spec.desc||'',
    grade:1,
    atk,
    baseAtk:atk,
    hp,
    maxHp:hp,
    keywords:[...mergedKeywords],
    // シールドは通常onBattleStart()で戦闘開始時に付与されるが、パネル召喚キャラは
    // onBattleStart()より後に盤面へ現れるため、召喚時点で自前で付与しておく
    shield:mergedKeywords.includes('シールド')?1:0,
    equipment:[],
    _panelSummoned:true,
    _sourcePanelName:spec.panelName||spec.name||'',
    manaOnAttack:spec.manaOnAttack||'',
    manaOnInjury:spec.manaOnInjury||'',
    manaCost:spec.manaCost||0,
    manaColor:spec.manaColor||spec.color||'',
    color:spec.color||'',
    art:spec.art||'',
    lane:'front'
  };
}

function _panelSummonSpec(panel){
  if(!panel) return null;
  if(panel.summonOnBattleStart) return panel.summonOnBattleStart;
  if(_isCharacterPanel(panel)){
    return {
      name:panel.name,
      atk:Number(panel.power??panel.atk??0),
      hp:Number(panel.life??panel.hp??1),
      count:panel.summonCount||1,
      race:panel.race||'',
      desc:panel.desc||'',
      keywords:panel.keywords||[],
      color:panel.color||panel.カラー||'',
      manaOnAttack:panel.manaOnAttack||'',
      manaOnInjury:panel.manaOnInjury||'',
      manaCost:Number(panel.manaCost||panel.costMana||0),
      manaColor:panel.manaColor||panel.color||panel.カラー||'',
      art:typeof getPanelArtPath==='function'?getPanelArtPath(panel):(panel.art||''),
      panelName:panel.name
    };
  }
  return null;
}

function _manaKey(color){
  const c=String(color||'').trim().toLowerCase();
  if(c==='赤'||c==='red') return 'red';
  if(c==='青'||c==='blue') return 'blue';
  if(c==='緑'||c==='green') return 'green';
  if(c==='黄'||c==='茶'||c==='yellow') return 'yellow';
  return '';
}
function _manaLabel(key){
  return {red:'赤',blue:'青',green:'緑',yellow:'茶'}[key]||key;
}
function _ensureMana(){
  G.mana=G.mana||{red:0,blue:0,green:0,yellow:0};
  ['red','blue','green','yellow'].forEach(k=>{ if(G.mana[k]==null) G.mana[k]=0; });
  return G.mana;
}
function _gainMana(color, amount, source){
  const key=_manaKey(color);
  if(!key) return;
  const m=_ensureMana();
  const n=Math.max(1,Number(amount)||1);
  m[key]=(m[key]||0)+n;
  log(`${source?_lc(source,false):'マナ'}の効果で${_manaLabel(key)}マナを${n}つ獲得した。`,'good');
  if(typeof renderManaHud==='function') renderManaHud();
  _checkManaCostSpells();
}
function _canPayPanelMana(panel){
  if(!panel||!panel.manaCost) return false;
  const key=_manaKey(panel.manaColor||panel.color||panel.カラー);
  return !!key&&(_ensureMana()[key]||0)>=Number(panel.manaCost||0);
}
function _payPanelMana(panel){
  const key=_manaKey(panel.manaColor||panel.color||panel.カラー);
  if(!key) return false;
  const cost=Number(panel.manaCost||0);
  if((_ensureMana()[key]||0)<cost) return false;
  G.mana[key]-=cost;
  if(typeof renderManaHud==='function') renderManaHud();
  return true;
}
function _afterPanelSummon(unit,isEnemySide){
  if(!unit||isEnemySide) return;
  const wild=_unitKeywordCount(unit,'野生の力');
  if(wild) _gainMana('green',wild,unit.name);
}
// ── スペルカード：スペル置き場のカードが指定マナに達したら1戦闘1回だけ自動発動 ──
const SPELL_EFFECTS={
  fire_arrow(card){
    const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
    if(!alive.length) return;
    const minHp=Math.min(...alive.map(e=>e.hp));
    const candidates=alive.filter(e=>e.hp===minHp);
    const target=candidates[Math.floor(Math.random()*candidates.length)];
    log(`${card.name}の効果で${_lc(target.name,true)}に5ダメージを与えた。`,'good');
    dealDmgToEnemy(target,5,G.enemies.indexOf(target),null);
  },
};
function _checkManaCostSpells(){
  if(G._checkingManaSpells) return;
  G._checkingManaSpells=true;
  try{
    (G.spellSlots||[]).forEach(card=>{
      if(!card||card._firedThisBattle||!_canPayPanelMana(card)) return;
      if(!_payPanelMana(card)) return;
      card._firedThisBattle=true;
      const effect=SPELL_EFFECTS[card.effectKey];
      if(typeof effect==='function') effect(card);
    });
  }finally{
    G._checkingManaSpells=false;
    if(typeof renderHandEditor==='function') renderHandEditor();
  }
}

function _summonPanelUnitToFront(unit, isEnemySide){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  for(let i=frontSlots-1;i>=0;i--){
    if(!arr[i]||arr[i].hp<=0||arr[i]._isObject||arr[i]._isSoul){
      unit.lane='front';
      arr[i]=unit;
      return i;
    }
  }
  return -1;
}

function applyNewPanelBattleStart(){
  (G.allies||[]).forEach(unit=>{
    if(!unit||unit.hp<=0) return;
    _applyAdjacentPanelEnhancements(unit,_collectAdjacentEnhancements(unit,0));
  });
  (G.allies||[]).forEach(owner=>{
    if(!owner||owner.hp<=0) return;
    // 戦闘順序（並べ替え可能な独立した並び）に従って召喚する。
    // _summonPanelUnitToFrontは右詰めで配置するため、並び順の先頭が左端に来るよう逆順で召喚する
    const battleOrder=typeof _syncUnitBattleOrder==='function'?_syncUnitBattleOrder(owner):null;
    const orderedPanels=battleOrder||(Array.isArray(owner.equipment)?owner.equipment.filter((p,i)=>i!==0&&p):[]);
    for(let oi=orderedPanels.length-1;oi>=0;oi--){
      const panel=orderedPanels[oi];
      const idx=(owner.equipment||[]).indexOf(panel);
      if(idx<0) continue;
      const spec=_panelSummonSpec(panel);
      if(!spec) continue;
      const enh=_collectAdjacentEnhancements(owner,idx);
      const contributingPanels=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(owner,idx):[];
      for(let n=0;n<(spec.count||1);n++){
        const summoned=_makePanelSummonUnit({...spec,panelName:panel.name},enh.keywords||[]);
        _applyAdjacentPanelEnhancements(summoned,enh);
        // コピー召喚先にも強化カードの効果全文がフロー表示されるよう、寄与している強化パネルを複製して引き継ぐ
        if(contributingPanels.length){
          summoned.equipment=[null,...contributingPanels.map(({panel:p})=>({...clone(p),directions:['up','down','left','right']}))];
        }
        if(_summonPanelUnitToFront(summoned,false)>=0){
          _afterPanelSummon(summoned,false);
          log(`${panel.name}が${_lc(summoned.name,false)}を召喚した。`,'good');
        }
      }
    }
  });
  compactBattleUnits();
}

function _refreshPermanentBuffedPanels(panelName){
  if(!panelName||!G.panelPermanentBuffs||!G.panelPermanentBuffs[panelName]) return;
  const buff=G.panelPermanentBuffs[panelName];
  const visit=card=>{
    if(!card||String(card.category||'')!=='キャラクター'||String(card.name||'')!==panelName) return;
    if(card._permBasePower==null) card._permBasePower=Number(card.power??card.atk??0)-Number(card._permBuffAtkApplied||0);
    if(card._permBaseLife==null) card._permBaseLife=Number(card.life??card.hp??1)-Number(card._permBuffHpApplied||0);
    card._permBuffAtkApplied=Number(buff.atk||0);
    card._permBuffHpApplied=Number(buff.hp||0);
    card.power=card._permBasePower+card._permBuffAtkApplied;
    card.life=card._permBaseLife+card._permBuffHpApplied;
  };
  (G.allies||[]).forEach(u=>(u?.equipment||[]).forEach(visit));
  if(typeof _rewCards!=='undefined') (_rewCards||[]).forEach(visit);
}

function _applyPermanentColorBuff(color, atk, hp, sourceName, unitIsEnemy){
  const key=typeof _manaKey==='function'?_manaKey(color):String(color||'').trim();
  if(!key) return;
  const label=typeof _manaLabel==='function'?_manaLabel(key):String(color||'').trim();
  G.panelColorPermanentBuffs=G.panelColorPermanentBuffs||{};
  G.panelColorPermanentBuffs[key]=G.panelColorPermanentBuffs[key]||{atk:0,hp:0};
  G.panelColorPermanentBuffs[key].atk+=atk||0;
  G.panelColorPermanentBuffs[key].hp+=hp||0;
  log(`${_lc(sourceName||label,unitIsEnemy)}の${label}強化が発動した。以後、報酬に出現する${label}のキャラクターは+${atk}/+${hp}を得る。`,'sys');
}

async function _applyDeathKeywordEffects(unit, unitIsEnemy){
  if(!unit) return;
  const allies=unitIsEnemy?G.enemies:G.allies;
  const foes=unitIsEnemy?G.allies:G.enemies;
  const count=kw=>_unitKeywordCount(unit,kw);
  const revenge=count('逆襲');
  for(let i=0;i<revenge;i++){
    allies.forEach(a=>{ if(a&&a.hp>0){ a.atk=(a.atk||0)+1; a.baseAtk=(a.baseAtk||0)+1; a.hp=(a.hp||0)+1; a.maxHp=(a.maxHp||0)+1; }});
    log(`${_lc(unit.name,unitIsEnemy)}の逆襲が発動した。全ての味方は+1/+1を得た。`,unitIsEnemy?'bad':'good');
  }
  const ritual=count('闇の儀式');
  for(let i=0;i<ritual;i++){
    const key=unit._sourcePanelName||unit.name;
    G.panelPermanentBuffs=G.panelPermanentBuffs||{};
    G.panelPermanentBuffs[key]=G.panelPermanentBuffs[key]||{atk:0,hp:0};
    G.panelPermanentBuffs[key].atk+=2;
    G.panelPermanentBuffs[key].hp+=2;
    _refreshPermanentBuffedPanels(key);
    log(`${_lc(unit.name,unitIsEnemy)}の闇の儀式が発動した。以後の${key}は+2/+2を得る。`,'sys');
  }
  const darkFlame=count('闇の炎');
  for(let i=0;i<darkFlame;i++){
    const entries=foes
      .filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul)
      .map(t=>({unit:t,side:(G.allies||[]).includes(t)?'ally':'enemy',amount:1,source:unit}));
    await applyDamageBatch(entries);
    log(`${_lc(unit.name,unitIsEnemy)}の闇の炎が発動した。全ての敵キャラクターに1ダメージを与えた。`,unitIsEnemy?'bad':'good');
  }
  const madness=count('狂気');
  for(let i=0;i<madness;i++) _gainMana('blue',1,unit.name);
  ['赤','青','緑','黄','茶'].forEach(color=>{
    const n=count(`${color}強化`);
    for(let i=0;i<n;i++) _applyPermanentColorBuff(color,1,1,unit.name,unitIsEnemy);
  });
  const redAll=count('赤全体強化3');
  for(let i=0;i<redAll;i++){
    allies.forEach(a=>{
      if(a&&a.hp>0&&String(a.color||'')==='赤'){
        a.atk=(a.atk||0)+3; a.baseAtk=(a.baseAtk||0)+3;
        a.hp=(a.hp||0)+3; a.maxHp=(a.maxHp||0)+3;
      }
    });
    log(`${_lc(unit.name,unitIsEnemy)}の効果で全ての赤キャラクターは+3/+3を得た。`,unitIsEnemy?'bad':'good');
  }
}

function _checkDragonContractInjury(unit){
  if(!unit||unit.hp<=0||unit.name==='ドラコニアン'||!_unitHasKeyword(unit,'竜の契約')) return;
  unit._dragonContractHits=(unit._dragonContractHits||0)+1;
  if(unit._dragonContractHits<5) return;
  unit.keywords=(unit.keywords||[]).filter(k=>k!=='竜の契約');
  unit.name='ドラコニアン';
  unit.race='竜';
  delete unit._isObject;
  delete unit._isSoul;
  unit.lane=unit.lane||'front';
  unit.atk=25;
  unit.baseAtk=25;
  unit.hp=40;
  unit.maxHp=40;
  log(`${_lc(unit.name,G.enemies.includes(unit))}の竜の契約が発動した。25/40のドラコニアンに変身した。`,'good');
}

function _onEnemyDeathPanelSummons(deadEnemy){
}

function _onAllyInjuredByPanel(unit){
  if(!unit||unit.hp<=0) return;
  if(_unitHasKeyword(unit,'治癒能力')){
    unit.hp+=2;
    unit.maxHp=(unit.maxHp||0)+2;
    log(`${_lc(unit.name,false)}の治癒能力が発動した。HP+2を得た。`,'good');
  }
}

function _onAllyDeathPanelSummons(){
}

// 攻撃ターゲットを決定する
function getAttackTarget(attacker, targets){
  const live=targets.filter(u=>u&&u.hp>0&&!u._isObject);
  if(!live.length) return null;
  const isFront=u=>(u.lane||'front')==='front';
  const isGuard=u=>{
    const keywordGuard=(u.keywords||[]).includes('守護');
    const canUseStaticGuard=(targets===G.enemies)||u._panelSummoned;
    return (u.hate&&u.hateTurns>0)||(canUseStaticGuard&&(u.guardian||keywordGuard));
  };
  const isStealth=u=>!!u.stealth;
  if(_unitHasKeyword(attacker,'貫通')){
    const piercePool=live.filter(u=>!isStealth(u));
    return randFrom(piercePool.length?piercePool:live);
  }
  const laneLocked=live.some(isFront)?live.filter(isFront):live;
  const visibleLane=laneLocked.filter(u=>!isStealth(u));
  const guardLine=visibleLane.filter(isGuard);
  if(guardLine.length) return randFrom(guardLine);
  // 1. 前衛が存在する場合は前衛のみを対象にする
  const pool=visibleLane.length>0?visibleLane:laneLocked;
  const finalPool=pool.length>0?pool:live;
  // 2. 狩人：最もHPの低い相手（前衛優先の中で）
  if(_unitHasKeyword(attacker,'狩人')){
    return finalPool.reduce((a,b)=>a.hp<b.hp?a:b);
  }
  // 3. ランダム
  return randFrom(finalPool);
}

async function allyAttackAction(ally, allyIdx){
  const attackDmg=_attackDamageValue(ally);
  if(attackDmg<=0) return; // ATK0は攻撃しない
  const liveE=G.enemies.filter(e=>e&&e.hp>0);
  if(!liveE.length) return;

  const target=getAttackTarget(ally,G.enemies);
  if(!target) return;
  const eIdx=G.enemies.indexOf(target);
  const isGlobal=_unitHasKeyword(ally,'全体攻撃');
  const isTriDir=_unitHasKeyword(ally,'三方向攻撃');
  hideAttackLine();

  if(ally.stealth){ ally.stealth=false; log(`${_lc(ally.name,false)}の隠密が解除された。`,'sys'); }

  // 攻撃時効果はアニメーション途中で発動する
  if(ally.hp>0) ally._attackEffectPending=true;
  if(ally.hp>0&&ally.manaOnAttack) _gainMana(ally.manaOnAttack,1,ally.name);

  // 全体攻撃・三方向攻撃・単体攻撃の振り分け
  const attackTargets=isGlobal?_targetsInSameAttackRow(target,G.enemies):isTriDir?([eIdx-1,eIdx,eIdx+1].filter(i=>i>=0&&i<G.enemies.length).map(i=>G.enemies[i]).filter(e=>e&&e.hp>0)):[target];
  const _allyNm=_lc(_battleLogName(ally,G.allies),false);
  if(isGlobal) log(`${_allyNm}が全ての敵に${attackDmg}ダメージを与えた。`);
  else if(isTriDir) log(`${_allyNm}が${_lc(_battleLogName(target,G.enemies),true)}と、隣接するキャラクターに${attackDmg}ダメージを与えた。`);
  else log(`${_allyNm}が${_lc(_battleLogName(target,G.enemies),true)}に${attackDmg}ダメージを与えた。`);

  if(attackTargets.length>1){
    await _dealMultiAttackDamageWithMutual(ally,false,target,attackTargets,attackDmg);
  } else {
    await _dealAttackDamageWithMutual(ally,false,target,eIdx,attackDmg);
  }
  // 多段攻撃（三段=×2、二段=×1）：1回目の攻撃には全体攻撃／三方向攻撃の対象選択がそのまま適用される。
  // 2段目以降の追加攻撃は単体攻撃扱いで、全体攻撃／三方向攻撃を持つ場合は発生しない。
  if(ally.hp>0&&!isGlobal&&!isTriDir){
    const extraHits=_unitHasKeyword(ally,'三段攻撃')?2:_unitHasKeyword(ally,'二段攻撃')?1:0;
    let curTgt=target;
    for(let hi=0;hi<extraHits;hi++){
      if(!curTgt||curTgt.hp<=0){
        curTgt=getAttackTarget(ally,G.enemies);
      }
      if(!curTgt||curTgt.hp<=0) break;
      hideAttackLine();
      // 攻撃時効果はアニメーション途中で発動する
      if(ally.hp>0) ally._attackEffectPending=true;
      if(ally.hp>0&&ally.manaOnAttack) _gainMana(ally.manaOnAttack,1,ally.name);
      log(`${_lc(_battleLogName(ally,G.allies),false)}の${hi+2}段攻撃！ ${_lc(_battleLogName(curTgt,G.enemies),true)}に${attackDmg}ダメージを与えた。`,'good');
      await _dealAttackDamageWithMutual(ally,false,curTgt,G.enemies.indexOf(curTgt),attackDmg);
    }
  }

  renderAll();
  await sleep(300);
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  if(enemy.atk<=0) return; // ATK0は攻撃しない
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;

  // ターゲット選択（前衛後衛ルール）
  const primaryTarget=getAttackTarget(enemy,G.allies);
  if(!primaryTarget) return;
  const targets=[primaryTarget];
  const primaryIdx=G.allies.indexOf(primaryTarget);

  const isGlobalAtk=enemy.keywords&&enemy.keywords.includes('全体攻撃');
  const isTriDirAtk=enemy.keywords&&enemy.keywords.includes('三方向攻撃');
  const liveAllForGlobal=_targetsInSameAttackRow(primaryTarget,G.allies).filter(a=>!a.stealth);
  hideAttackLine();

  const atkVal=enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;

  // 攻撃時効果はアニメーション途中で発動する
  if(atkVal>0&&enemy.hp>0) enemy._attackEffectPending=true;

  // 全体攻撃・三方向攻撃・単体攻撃の振り分け（三方向攻撃：隣接3スロット、隠密は除外）
  const _triAIdxs=isTriDirAtk?[primaryIdx-1,primaryIdx,primaryIdx+1].filter(i=>i>=0&&i<G.allies.length&&G.allies[i]&&G.allies[i].hp>0&&!G.allies[i].stealth):[];
  const finalTargets=isGlobalAtk?liveAllForGlobal:isTriDirAtk?_triAIdxs.map(i=>G.allies[i]):targets;

  // 全ターゲットを攻撃
  const _enemyNm=_lc(_battleLogName(enemy,G.enemies),true);
  if(isGlobalAtk) log(`${_enemyNm}が全ての味方に${atkVal}ダメージを与えた。`);
  else if(isTriDirAtk) log(`${_enemyNm}が${_lc(_battleLogName(primaryTarget,G.allies),false)}と、隣接するキャラクターに${atkVal}ダメージを与えた。`);
  else log(`${_enemyNm}が${_lc(_battleLogName(primaryTarget,G.allies),false)}に${atkVal}ダメージを与えた。`);
  if(finalTargets.length>1){
    await _dealMultiAttackDamageWithMutual(enemy,true,primaryTarget,finalTargets,atkVal);
  } else {
    await _dealAttackDamageWithMutual(enemy,true,primaryTarget,primaryIdx,atkVal);
  }

  // 多段攻撃キーワード（三段=×2、二段=×1）：1回目の攻撃には全体攻撃／三方向攻撃の対象選択がそのまま適用される。
  // 2段目以降の追加攻撃は単体攻撃扱いで、全体攻撃／三方向攻撃を持つ場合は発生しない。
  if(!isGlobalAtk&&!isTriDirAtk&&enemy.hp>0){
    const extraHits=enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0;
    let reTgt=finalTargets[0];
    for(let hi=0;hi<extraHits;hi++){
      if(!reTgt||reTgt.hp<=0){
        reTgt=getAttackTarget(enemy,G.allies);
      }
      if(!reTgt||reTgt.hp<=0) break;
      hideAttackLine();
      // 攻撃時効果はアニメーション途中で発動する
      if(atkVal>0&&enemy.hp>0) enemy._attackEffectPending=true;
      log(`${_lc(enemy.name,true)}の${hi+2}段攻撃！ ${_lc(reTgt.name,false)}に${atkVal}ダメージを与えた。`,'bad');
      await _dealAttackDamageWithMutual(enemy,true,reTgt,G.allies.indexOf(reTgt),atkVal);
    }
  }

  // 標的ターン消費はbattlePhaseで1ラウンドに1回行う

  renderAll();
  await sleep(300);
}

// ── 味方へのダメージ処理 ─────────────────────────

function _redirectToBodyguard(list, unit, tone) {
  return unit;
}

// 戻り値：ダメージが通った(true) / 0ダメまたはシールドでブロック(false)
function dealDmgToAlly(unit, dmg, _fieldIdx, src, _suppressCounter, _skipRedirect, _skipPanelCounter){
  if(!unit||unit.hp<=0) return false;
  if(dmg>0&&!_skipRedirect){
    const redirected=_redirectToBodyguard(G.allies, unit, 'good');
    if(redirected!==unit){
      unit=redirected;
      _fieldIdx=G.allies.indexOf(unit);
    }
  }

  // 0ダメ（無効化）
  if(dmg<=0){
    return false;
  }

  // シールド
  if(unit.shield>0){
    unit.shield--;
    log(`${_lc(unit.name,false)}のシールドがダメージを防いだ。`,'sys');
    onAllyShieldLost(unit);
    return false; // ダメージをシールドで防いだ
  }

  const actualDmg=Math.max(0, dmg);
  unit.hp=Math.max(0,unit.hp-actualDmg);
  if(actualDmg>0&&typeof playHitVfx==='function') playHitVfx('ally',unit,actualDmg);
  if(actualDmg>0&&typeof playSfx==='function') playSfx('hitLight',{group:'combat'});
  if(actualDmg>0&&unit.hp>0){
    if(unit.manaOnInjury) _gainMana(unit.manaOnInjury,1,unit.name);
    _checkDragonContractInjury(unit);
    _onAllyInjuredByPanel(unit);
  }
  if(dmg>0&&src&&src.keywords&&src.keywords.length&&unit.hp>0){
    applyKeywordOnHit(src,unit,actualDmg);
  }

  const willDie=unit.hp<=0;

  if(willDie){
    unit.hp=0;
    _delayDeathCompact(850);
    processAllyDeath(unit);
  } // 負傷でHP回復しても死亡確定
  return true; // ダメージが通った
}

// ── 味方の死亡処理 ──────────────────────────────

async function processAllyDeath(unit){
  if(unit.hp>0||unit._deathProcessed) return;
  const reviveKw=['再生','復活','根性'].find(k=>_unitHasKeyword(unit,k));
  if(reviveKw&&!unit._starterRegenUsed){
    await _applyDeathKeywordEffects(unit,false);
    _onAllyDeathPanelSummons();
    G.battleCounters.deaths++;
    if(typeof _onAnyCharDeath==='function') _onAnyCharDeath(unit);
    unit._starterRegenUsed=true;
    unit.keywords=(unit.keywords||[]).filter(k=>k!==reviveKw);
    unit.hp=1;
    // 根性は「致死ダメージを受けてもHP1で耐える」効果のため、HPが一瞬0になったことで
    // 通常のダメージ処理内（hp>0判定）ではスキップされてしまう負傷トリガーをここで代わりに発動する
    if(reviveKw==='根性'){
      if(unit.manaOnInjury) _gainMana(unit.manaOnInjury,1,unit.name);
      _checkDragonContractInjury(unit);
      _onAllyInjuredByPanel(unit);
    }
    log(`${_lc(unit.name,false)}が${reviveKw}の効果で蘇った。`,'good');
    requestBattleCompact();
    return;
  }
  unit._deathProcessed=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  await _applyDeathKeywordEffects(unit,false);
  _onAllyDeathPanelSummons();

  log(`${_lc(unit.name,false)}が倒れた…`,'bad');
  G.battleCounters.deaths++;

  // ナグルファル：キャラクター死亡ごとに+2/+1
  _onAnyCharDeath(unit);
  compactBattleUnitsAfterDeath();
}

function _onAnyCharDeath(deadUnit){
  if(!deadUnit) return;
  const deadIsEnemy=(G.enemies||[]).includes(deadUnit);
  const applyToSide=(units,isEnemySide)=>{
    (units||[]).forEach(unit=>{
      if(!unit||unit.hp<=0||unit===deadUnit) return;
      const text=String(unit.desc||unit.effectText||'');
      if(!text.includes('仲間が死亡するたび')||!text.includes('+2/+1')) return;
      if(isEnemySide!==deadIsEnemy) return;
      unit.atk=Math.max(0,(Number(unit.atk)||0)+2);
      unit.baseAtk=Math.max(0,(Number(unit.baseAtk)||0)+2);
      addUnitHp(unit,1,isEnemySide?'enemy':'ally');
      log(`${_lc(unit.name,isEnemySide)}：仲間の死に応じて+2/+1`,'good');
    });
  };
  applyToSide(G.enemies,true);
  applyToSide(G.allies,false);
}


// ── シールド喪失時 ──────────────────────────────

function onAllyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'ally');
}

function onEnemyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'enemy');
}

function onBattleStart(){
  G._freeItemPhase='battle';
  G._freeItemUsed=false;

  // 成長X：戦闘開始時、+X/+Xを得る（自身のみ・両陣営）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const growKw=(a.keywords||[]).find(k=>/^成長\d+$/.test(k));
    if(!growKw) return;
    const x=parseInt(growKw.slice(2))+(G.hasGoldenDrop?1:0);
    a.atk+=x; a.baseAtk=(a.baseAtk||0)+x;
    const _xhg=addUnitHp(a,x);
    log(`${_lc(a.name,false)}は成長し、+${x}/+${_xhg}を得た。`,'good');
  });
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    const growKw=(e.keywords||[]).find(k=>/^成長\d+$/.test(k));
    if(!growKw) return;
    const x=parseInt(growKw.slice(2));
    e.atk+=x; e.baseAtk=(e.baseAtk||0)+x;
    e.hp+=x; e.maxHp+=x;
    log(`${_lc(e.name,true)}は成長し、+${x}/+${x}を得た。`,'bad');
  });
  // シールド：戦闘開始時にダメージ無効化シールドを得る（重複しない）。「A・シールド」キーワードは廃止済み。
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    if(_unitHasKeyword(a,'シールド')&&!a.shield){
      a.shield=1;
      log(`${_lc(a.name,false)}がシールドを得た。`,'good');
    }
  });
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    if(_unitHasKeyword(e,'シールド')&&!e.shield){
      e.shield=1;
      log(`${_lc(e.name,true)}がシールドを得た。`,'bad');
    }
  });
}

// ── 戦闘終了時処理 ───────────────────────────

function onBattleEnd(){
  G.allies=(G.allies||[]).map(u=>u&&u._panelSummoned?null:u);
  G.enemies=(G.enemies||[]).map(u=>u&&u._panelSummoned?null:u);
  // 仲間になったエリート/ボスの属性を解除
  G.allies.forEach(a=>{
    if(!a||!a.keywords) return;
    const had=a.keywords.some(k=>k==='エリート'||k==='ボス');
    if(had){
      a.keywords=a.keywords.filter(k=>k!=='エリート'&&k!=='ボス');
      if(a.boss) delete a.boss;
      log(`${a.name}：エリート/ボス属性を解除`,'sys');
    }
  });

  // 成長X は戦闘開始時に適用（onBattleStart 側）

  // 死亡ユニット（再生・復活で回復しなかった）をフィールドから除去
  for(let i=0;i<G.allies.length;i++){
    const a=G.allies[i];
    if(a&&a.hp<=0) G.allies[i]=null;
  }
}

// ── 勝利ボーナス ───────────────────────────────

function applyVictoryBonuses(){
  onBattleEnd();
}

// ── スペル使用後の勝利チェック ──────────────────

function checkInstantVictory(){
  if(G.phase==='player'&&G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){
    if(_checkRearCenterAllyGameOver()) return true;
    if(_isBossFight) G._bossJustDefeated=true;
    applyVictoryBonuses();
    log('敵を全滅させた！','gold');
    updateHUD(); renderAll();
    G.phase='reward';
    setTimeout(()=>_handleVictory(),400);
    return true;
  }
  return false;
}

// ── キーワード効果 ─────────────────────────────

function applyKeywordOnHit(attacker, target, damageDone){
  const kws=attacker.keywords||[];
  if(!kws.length||target.hp<=0) return;
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  if(kws.includes('即死')){ target.hp=0; log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}を即死させた！`,'bad'); }
  // 毒牙X：命中時に毒Xを付与（加算）
  const erosionKw=kws.find(k=>/^毒牙\d+$/.test(k));
  if((erosionKw||kws.includes('毒牙'))&&target.hp>0){
    const basePoison=erosionKw?parseInt(erosionKw.slice(2)):Math.max(0,Math.floor(damageDone??attacker.atk??0));
    const pv=basePoison+_gdKw;
    target.poison=(target.poison||0)+pv;
    log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}に毒${pv}を与えた。`,'bad');
  }
  const poisonBladeKw=kws.find(k=>/^毒\d+$/.test(k));
  if(poisonBladeKw&&target.hp>0){
    const pv=parseInt(poisonBladeKw.slice(1))+_gdKw;
    target.poison=(target.poison||0)+pv;
    log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}に毒${pv}を与えた。`,'bad');
  }
  // 邪眼X：命中時にターゲットのATKをX減少
  const evilEyeKw=kws.find(k=>/^邪眼\d+$/.test(k));
  if(evilEyeKw&&target.hp>0){
    const ev=parseInt(evilEyeKw.slice(2))+_gdKw;
    target.atk=Math.max(0,target.atk-ev);
    target.baseAtk=Math.max(0,(target.baseAtk||target.atk)-ev);
    log(`${_lc(attacker.name,!_isPlayerAlly)}が${_lc(target.name,_isPlayerAlly)}の攻撃力を${ev}減少させ、${target.atk}にした。`,'bad');
  }
}

// ── 敵へのダメージ処理 ──────────────────────────

function dealDmgToEnemy(e,dmg,eIdx,srcUnit){
  if(!e||e.hp<=0) return;
  if(dmg>0){
    const redirected=_redirectToBodyguard(G.enemies, e, 'bad');
    if(redirected!==e){
      e=redirected;
      eIdx=G.enemies.indexOf(e);
    }
  }
  if(e.shield>0&&dmg>0){
    e.shield--;
    log(`${_lc(e.name,true)}のシールドがダメージを防いだ。`,'sys');
    onEnemyShieldLost(e);
    return;
  }
  const actualDmgToEnemy=Math.max(0,dmg);
  e.hp=Math.max(0,e.hp-actualDmgToEnemy);
  if(actualDmgToEnemy>0&&typeof playHitVfx==='function') playHitVfx('enemy',e,actualDmgToEnemy);
  if(actualDmgToEnemy>0&&typeof playSfx==='function') playSfx('hitLight',{group:'combat'});
  if(actualDmgToEnemy>0&&e.hp>0) _checkDragonContractInjury(e);
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
    if(srcUnit&&srcUnit.keywords&&srcUnit.keywords.length&&e.hp>0){
      applyKeywordOnHit(srcUnit,e,actualDmgToEnemy);
    }
  }
  if(e.hp<=0){
    _delayDeathCompact(850);
    processEnemyDeath(e,eIdx);
  }
}

async function processEnemyDeath(e,eIdx){
  if(e._dp) return;
  const reviveKw=['再生','復活','根性'].find(k=>_unitHasKeyword(e,k));
  if(reviveKw&&!e._starterRegenUsed){
    await _applyDeathKeywordEffects(e,true);
    _onEnemyDeathPanelSummons(e);
    _onAnyCharDeath(e);
    e._starterRegenUsed=true;
    e.keywords=(e.keywords||[]).filter(k=>k!==reviveKw);
    e.hp=1;
    // 根性は「致死ダメージを受けてもHP1で耐える」効果のため、HPが一瞬0になったことで
    // 通常のダメージ処理内（hp>0判定）ではスキップされてしまう負傷トリガーをここで代わりに発動する
    if(reviveKw==='根性') _checkDragonContractInjury(e);
    log(`${_lc(e.name,true)}が${reviveKw}の効果で蘇った。`,'bad');
    requestBattleCompact();
    return;
  }
  e._dp=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  await _applyDeathKeywordEffects(e,true);
  // エリート判定：キーワードではなくインデックスで判定（ENEMY_POOLデータにエリートKWが混入しても誤発火しない）
  const _isActualElite=G._isEliteFight&&G._eliteIdx>=0&&eIdx===G._eliteIdx;
  if(_isActualElite) G._eliteKilled=true;
  log(`${_lc(e.name,true)}撃破！`,'gold');
  if(typeof onGoldGained==='function') onGoldGained(1);
  _onEnemyDeathPanelSummons(e);
  // ナグルファル：敵死亡でも+2/+1
  _onAnyCharDeath(e);
  compactBattleUnitsAfterDeath();
  updateHUD();
}

// ── プレイヤーパス ────────────────────────────

async function playerPass(){
  if(G.phase!=='player'||G._battlePhaseRunning) return;
  G._battlePhaseRunning=true;
  G._showGlobalPanels=false;
  const hp=document.getElementById('hand-pane');
  const hs=document.getElementById('hand-slots');
  if(hp) hp.style.display='none';
  if(hs) hs.innerHTML='';
  const passBtn=document.getElementById('btn-pass');
  passBtn.textContent='戦闘実行';
  passBtn.style.display='none';
  passBtn.disabled=true;
  await battlePhase();
}

// ── 勝利オーバーレイ ──────────────────────────

function showVictoryOverlay(){
  if(G._battleDefeatHandled) return;
  if(!(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul)) return;
  const ov=document.getElementById('victory-overlay');
  if(typeof playSfx==='function') playSfx('victory',{group:'ui'});
  if(ov) ov.style.display='flex';
}

// summon.js から統合（論理削除用）
function calcActions() {
  return 3;
}
function fireTrigger(trigger, sourceRingId) {
  // 指輪トリガー（廃止済み）の名残：安全な no-op として維持
}
