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
  // 注：戦闘終了時にはonBattleEnd()が_panelSummonedなユニット（＝現行仕様の全味方）を
  // G.alliesから除去済みのため、ここで「味方が生存しているか」を再チェックすることはできない。
  // 勝利可否の判定はfinishBattleAsVictory()の呼び出し元（_onAllEnemiesDefeated等）側で完了している。
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showScreen('clear');
  } else {
    // 表示タイマーと非表示タイマーを独立したsetTimeoutで走らせず、表示が確定してから
    // 一定時間後に非表示にするようチェーンする（メインスレッドが混雑していても表示が
    // 一瞬で消えないようにするため）。
    showVictoryOverlay(()=>{
      const ov=document.getElementById('victory-overlay');
      if(ov) ov.style.display='none';
      if(G.phase==='reward') goToReward();
    });
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
  G._battleDraw=false;
  document.body.classList.remove('reward-screen-active');
  (G.spellSlots||[]).forEach(c=>{ if(c){ delete c._firedThisBattle; delete c._manaFireCount; } });
  (G.allies||[]).forEach(u=>{
    (u?.equipment||[]).forEach(p=>{
      if(p){
        delete p._rewardReturnCard;
        delete p._rewardReturnIdx;
        delete p._rewardReturnPhaseId;
      }
    });
  });
  if(typeof setBattleStageBackground==='function') setBattleStageBackground();
  _updateLaneOffset();
  clearLog();

  updateGoldenDrop();
  if(typeof syncUnitPanelStatBonuses==='function') G.allies.forEach(a=>syncUnitPanelStatBonuses(a));
  G._masterHandReady=false;
  G._manaCycleUsed=false;
  G._eidolonDeathCount=0;
  G.mana=0;
  G.allies.forEach(a=>{ if(a){ delete a._deathProcessed; delete a._manaFireCount; } });
  G.enemies.forEach(e=>{ if(e){ delete e._deathProcessed; delete e._manaFireCount; } });

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
  // 報酬フェイズから素早く次戦へ移行した際、報酬カード置き場（旧配置順置き場）とメイン置き場が
  // 直前のレンダリング内容のまま画面に残ってしまう（renderAll()はこれらを更新しないため）のを防ぐ
  const battleOrderSection=document.getElementById('battle-order-section');
  if(battleOrderSection) battleOrderSection.style.display='none';
  const battleOrderRow=document.getElementById('battle-order-row');
  if(battleOrderRow) battleOrderRow.innerHTML='';
  if(typeof renderHandEditor==='function') renderHandEditor();

  const fd=FLOOR_DATA[G.floor];
  _isBossFight=!!(fd&&fd.boss);

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G.battleCounters={damage:0,deaths:0};

  G.enemies=generateEnemies(G.floor);
  // 敵は前衛5体・後衛3体の最大8枠へ整列。オブジェクトは出現させない。
  {
    const _scriptedOpening=typeof usesOpeningBattleEnemyFormation==='function'&&usesOpeningBattleEnemyFormation(G.floor);
    const _actualEnemies=G.enemies.filter(e=>e&&!e._isObject);
    while(!_scriptedOpening&&_actualEnemies.length<4&&_actualEnemies.length>0){
      const base=_actualEnemies[_actualEnemies.length%_actualEnemies.length]||_actualEnemies[0];
      const extra=JSON.parse(JSON.stringify(base));
      extra.id=uid();
      extra.lane='front';
      _actualEnemies.push(extra);
    }
    const _newEnemies=new Array(MAX_ENEMIES||8).fill(null);
    if(!_isBossFight&&!_scriptedOpening) _layoutEnemyLanes(_actualEnemies);
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
  document.body.classList.add('battle-turn-active');
  renderControls();
  log(`戦闘開始！`,'sys');

  let safety=0;
  // 数が多い陣営が先攻（前衛・後衛を問わず生存キャラクター数で比較）
  const _livingCount=arr=>(arr||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  let side=_livingCount(G.enemies)>_livingCount(G.allies)?'enemy':'ally';
  // 前衛が全員攻撃し終えたら後衛、後衛が全員攻撃し終えたら再度前衛の左端から、という
  // レーン単位のサイクルを陣営ごとに管理する（前衛全滅を待つ旧仕様は廃止）
  const enemyLaneState={lane:'front',attacked:new Set()};
  const allyLaneState={lane:'front',attacked:new Set()};
  while(!_checkBattleOver()&&safety++<500){
    if(!_pickLaneAttacker(G.enemies,true,enemyLaneState)&&!_pickLaneAttacker(G.allies,false,allyLaneState)){
      G._battleDraw=true;
      // 盤面に生存中の敵が残っていても報酬フェイズへ安全に移行できるようクリアする
      G.enemies=new Array(MAX_ENEMIES||14).fill(null);
      finishBattleAsVictory('Draw');
      return;
    }
    if(side==='enemy'){
      const pick=_pickLaneAttacker(G.enemies,true,enemyLaneState);
      if(!pick){
        side='ally';
        continue;
      }
      if(pick.switched){ enemyLaneState.lane=pick.lane; enemyLaneState.attacked=new Set(); }
      const enemy=G.enemies[pick.idx];
      enemyLaneState.attacked.add(enemy.id);
      await enemyAttackAction(enemy,pick.idx);
      compactBattleUnits();
      if(_checkBattleOver()) return;
      side='ally';
    } else {
      const pick=_pickLaneAttacker(G.allies,false,allyLaneState);
      if(!pick){
        side='enemy';
        continue;
      }
      if(pick.switched){ allyLaneState.lane=pick.lane; allyLaneState.attacked=new Set(); }
      const ally=G.allies[pick.idx];
      allyLaneState.attacked.add(ally.id);
      await allyAttackAction(ally,pick.idx);
      compactBattleUnits();
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

// 指定レーン内の攻撃可能ユニットのスロット添字を左（若い添字）から順に列挙する
function _laneAttackCandidates(arr,isEnemy,lane){
  const max=isEnemy?(MAX_ENEMIES||8):(MAX_ALLIES||5);
  const result=[];
  for(let i=0;i<max;i++){
    const u=arr[i];
    if(!u||u.hp<=0) continue;
    if(isEnemy&&u._isObject) continue;
    if(!isEnemy&&(u._isSoul||u._isObject)) continue;
    if((u.lane||'front')!==lane) continue;
    const atkVal=isEnemy?(u.nullified>0?0:(u.atk||0)):_attackDamageValue(u);
    // ATK0で攻撃自体はスキップされる場合でも、毒を持つキャラクターは毒ダメージ処理のために手番を得る
    if((atkVal||0)<=0&&!(u.poison>0)) continue;
    result.push(i);
  }
  return result;
}

// state={lane:'front'|'rear', attacked:Set<id>} を参照し、現在のレーンでまだ攻撃していない
// 最も左のユニットを返す。現在のレーンを全員攻撃し終えていれば反対のレーンへの切り替えを提案する
// （実際のレーン切り替え・attacked集合のリセットは呼び出し側がswitched===trueを見て確定させる）。
function _pickLaneAttacker(arr,isEnemy,state){
  const current=_laneAttackCandidates(arr,isEnemy,state.lane).filter(i=>!state.attacked.has(arr[i].id));
  if(current.length) return {idx:current[0],lane:state.lane,switched:false};
  const otherLane=state.lane==='front'?'rear':'front';
  const other=_laneAttackCandidates(arr,isEnemy,otherLane);
  if(other.length) return {idx:other[0],lane:otherLane,switched:true};
  // 反対のレーンに攻撃可能なユニットが一人もいない（後衛不在等）場合、そのままだと
  // 生存者がいても永久にnullを返し続けてしまう（誤って引き分け扱いになるバグの原因だった）。
  // 同じレーンを新しいパスとして再開できないか確認する。
  const resetCurrent=_laneAttackCandidates(arr,isEnemy,state.lane);
  if(resetCurrent.length) return {idx:resetCurrent[0],lane:state.lane,switched:true};
  return null;
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
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,maxA-frontSlots));
  const nextAllies=new Array(maxA).fill(null);
  const liveAllies=(G.allies||[]).filter(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
  liveAllies.forEach(clampUnitStats);
  const allyFront=liveAllies.filter(a=>(a.lane||'front')!=='rear');
  const allyRear=liveAllies.filter(a=>(a.lane||'front')==='rear');
  _placeCenteredRow(nextAllies,allyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextAllies,allyRear.slice(0,rearSlots),frontSlots,rearSlots,'rear');
  G.allies=nextAllies;
  const maxE=MAX_ENEMIES||10;
  const enemyRearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,maxE-frontSlots));
  const nextEnemies=new Array(maxE).fill(null);
  const liveEnemies=(G.enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject);
  liveEnemies.forEach(clampUnitStats);
  const enemyFront=liveEnemies.filter(e=>(e.lane||'front')!=='rear');
  const enemyRear=liveEnemies.filter(e=>(e.lane||'front')==='rear');
  _placeCenteredRow(nextEnemies,enemyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextEnemies,enemyRear.slice(0,enemyRearSlots),frontSlots,enemyRearSlots,'rear');
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
  const liveEnemies=G.enemies.filter(e=>e&&e.hp>0&&!e._isObject);
  const liveAllies=G.allies.filter(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul);
  if(liveEnemies.length===0&&liveAllies.length===0){
    G._battleDraw=true;
    finishBattleAsVictory('Draw');
    return true;
  }
  if(liveEnemies.length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!liveAllies.length){ setTimeout(()=>handleBattleDefeat(),200); return true; }
  return false;
}

function handleBattleDefeat(){
  if(G._battleDefeatHandled) return;
  G._battleDefeatHandled=true;
  gameOver();
}

// メイン置き場に固定リーダー（後衛中央）が存在した旧仕様の名残。
// 現行仕様では後衛は任意（後衛不在の編成も許可）のため、この条件による敗北判定は行わない。
// 全滅判定は_checkBattleOver()/_onAllEnemiesDefeated()側で別途行う。
function _checkRearCenterAllyGameOver(){
  return false;
}

// ── 勝利確定（敵全滅・引き分けの両方から呼ばれる共通処理）─────────
// 二重発火防止（G.phase==='reward'なら何もしない）は必須。
function finishBattleAsVictory(reason){
  if(G.phase==='reward') return;
  if(reason) log(reason,'gold');
  applyVictoryBonuses();
  updateHUD();
  G.phase='reward';
  document.body.classList.remove('battle-turn-active');
  setTimeout(()=>_handleVictory(),600);
}

function _onAllEnemiesDefeated(){
  if(G.phase==='reward') return; // 二重呼び出し防止
  if(!(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul)){
    G._battleDraw=true;
    finishBattleAsVictory('Draw');
    return;
  }
  if(_checkRearCenterAllyGameOver()) return;
  if(_isBossFight) G._bossJustDefeated=true;
  finishBattleAsVictory('敵を全滅させた！');
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
  // サイレン：攻撃：全てのキャラクターに1ダメージを与える。（両陣営とも対象）
  if(/^攻撃：全てのキャラクターに1ダメージを与える。/.test(desc)){
    const entries=[
      ...allies.filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul).map(t=>({unit:t,side:isEnemySide?'enemy':'ally',amount:1,source:unit})),
      ...foes.filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul).map(t=>({unit:t,side:isEnemySide?'ally':'enemy',amount:1,source:unit})),
    ];
    await applyDamageBatch(entries,{source:unit});
    log(`${_lc(unit.name,isEnemySide)}の効果で全てのキャラクターに1ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  // ケンタウロス：攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。
  if(/^攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。/.test(desc)){
    const alive=foes.filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul);
    const x=_ensureMana();
    if(alive.length&&x>0){
      const target=alive[Math.floor(Math.random()*alive.length)];
      await applyDamageBatch([{unit:target,side:isEnemySide?'ally':'enemy',amount:x,source:unit}],{source:unit});
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,!isEnemySide)}に${x}ダメージを与えた。`,isEnemySide?'bad':'good');
    }
  }
  // ボーンチャリオット：攻撃：隣接するキャラクターの死亡効果を発動する。（死亡はしない）
  if(/^攻撃：隣接するキャラクターの死亡効果を発動する。/.test(desc)&&!isEnemySide){
    const neighbors=[_leftNeighborAlly(unit),_rightNeighborAlly(unit)].filter(n=>n&&n.hp>0);
    for(const n of neighbors) await _applyDeathKeywordEffects(n,false);
  }
  ['赤','青','緑','黄','紫'].forEach(color=>{
    const n=_unitKeywordCount(unit,`${color}強化`);
    for(let i=0;i<n;i++) _applyPermanentColorBuff(color,1,1,unit.name,isEnemySide);
  });
}

// 闇の儀式：常時：このキャラクターの攻撃効果は1回追加で発動する。（接続枚数分繰り返す）
async function _applyAllyAttackEffects(ally){
  await _applyUnitAttackEffects(ally,false);
  const extra=_unitKeywordCount(ally,'闇の儀式');
  for(let i=0;i<extra&&ally&&ally.hp>0;i++){
    await _applyUnitAttackEffects(ally,false);
  }
}

async function _applyEnemyAttackEffects(enemy){
  await _applyUnitAttackEffects(enemy,true);
  const extra=_unitKeywordCount(enemy,'闇の儀式');
  for(let i=0;i<extra&&enemy&&enemy.hp>0;i++){
    await _applyUnitAttackEffects(enemy,true);
  }
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
    // 「復活を付与する」は自身ではなく他者に付与する効果文のため、自身の復活キーワードとしては扱わない
    // （レイス等：これを除外しないと、死亡時に自分自身が誤って復活してしまう）
    if(k==='復活'&&unitText.includes('復活を付与する')&&!unitText.replace('復活を付与する','').includes('復活')) return;
    if(unitText.includes(k)) kws.push(k);
  });
  // 注：以前はunit.equipment（召喚キャラクターがフロー表示用に複製保持している接続強化パネルの
  // クローン）もここで再スキャンしていたが、そのパネルは既に_collectAdjacentEnhancements経由で
  // unit.keywordsに反映済みのため、再スキャンすると同じキーワードが二重・三重に数えられ、
  // 逆襲/闇の儀式/狂気等のカウント依存効果（death Repeats等）が過剰発動するバグの原因になっていた。
  // unit.keywordsのみを正とする。
  return kws;
}

function _unitHasKeyword(unit, kw){
  return _unitPanelKeywords(unit).includes(kw);
}

function _unitKeywordCount(unit, kw){
  if(!kw) return 0;
  return _unitPanelKeywords(unit).filter(k=>k===kw).length;
}

function _unitEffectPanelCount(unit, kw){
  if(!unit||!kw) return 0;
  // 接続数のカウントはequipment配列の添字（盤面上の位置＝物理的に別々の接続）で数える。
  // p.id/p.uidは同じ強化カードを複数枚接続した場合でも同じ値（テンプレート由来）になるため、
  // これをキーにすると2枚目以降が「同一パネル」とみなされ重複発動しなくなるバグの原因だった。
  const seen=new Set();
  (Array.isArray(unit.equipment)?unit.equipment:[]).forEach((p,i)=>{
    if(!p||String(p.category||'')==='キャラクター') return;
    const names=[p.name,...(p.keywords||[]),...(p.adjacentKeywords||[])].filter(Boolean);
    if(names.includes(kw)) seen.add(i);
  });
  return seen.size;
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
  // 弱体X：このキャラクターが受ける1以上のダメージはX増加する（複数付与された場合は加算値で保持）
  if(unit.weaken>0) dmg+=unit.weaken;
  unit._lastDamageSource=source||unit._lastDamageSource||null;
  const actualDmg=Math.max(0,dmg);
  const _preHp=unit.hp||0;
  unit.hp=Math.max(0,(unit.hp||0)-actualDmg);
  if(side==='enemy'&&actualDmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
  }
  if(actualDmg>0&&unit.hp>0){
    if(side==='ally'){
      _checkDragonContractInjury(unit);
      // フォルモール：常時：味方の負傷効果は1回追加で発動する。（陣営全体、_fireAllyInjuryEffects内のinjuryRepeatsで集計済み）
      if(_fireAllyInjuryEffects(unit,actualDmg)) _bumpEtinOnAllyInjuryEffect();
      // レムレース：負傷：このキャラクターをダメージを与えたキャラクターに変身する。
      _applyLemuresInjuryTransform(unit);
    } else {
      _checkDragonContractInjury(unit);
    }
  }
  // 生命吸収等は対象を倒した場合も発動するため、unit.hp>0では絞り込まない
  if(actualDmg>0&&source&&((source.keywords&&source.keywords.length)||source.weakenOnHit>0)){
    applyKeywordOnHit(source,unit,actualDmg,_preHp);
  }
  if(side==='enemy'&&unit.instadead&&actualDmg>0) unit.hp=0;
  return {unit,side,actualDmg,died:unit.hp<=0,blocked:false};
}

// ── 味方の負傷トリガー効果一式（マナ獲得＋名前別の負傷効果）。発動したら true を返す ──
// 執念の炎：常時：このキャラクターの負傷効果は1回追加で発動する。
function _fireAllyInjuryEffects(unit, actualDmg){
  let fired=false;
  // フォルモール：常時：味方の負傷効果は1回追加で発動する。（陣営内の全味方が対象）
  const _formorianCount=(G.allies||[]).filter(u=>u&&u.hp>0&&u.name==='フォルモール').length;
  const injuryRepeats=1+_unitKeywordCount(unit,'執念の炎')+_formorianCount;
  for(let i=0;i<injuryRepeats;i++){
    if(unit.manaOnInjury){ _gainMana(unit.manaOnInjury,unit.name); fired=true; }
    if(_onAllyInjuredByPanel(unit,actualDmg)) fired=true;
  }
  return fired;
}

// エティン：常時：味方の負傷効果が発動するたび、このキャラクターは+2/+1を得る。
function _bumpEtinOnAllyInjuryEffect(){
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0) return;
    if(!/常時：味方の負傷効果が発動するたび、このキャラクターは\+2\/\+1を得る。/.test(String(u.desc||''))) return;
    u.atk=(u.atk||0)+2; u.baseAtk=(u.baseAtk||0)+2;
    addUnitHp(u,1,'ally');
    log(`${_lc(u.name,false)}の効果が発動した。+2/+1を得た。`,'good');
  });
}

// マータ：常時：味方が受ける2以上のダメージの半分を代わりに受ける。
// applyDamageBatch()に渡す前のエントリ段階で振り分けることで、VFX・死亡処理を含む
// 通常のダメージパイプラインにマータ自身へのダメージも自然に乗せる。
function _splitEntriesForMata(entries){
  const out=[];
  (entries||[]).forEach(e=>{
    if(!e||!e.unit||!(e.amount>0)){ out.push(e); return; }
    const side=e.side||_damageSideOf(e.unit);
    if(side==='ally'&&e.amount>=2&&e.unit.name!=='マータ'){
      const mata=(G.allies||[]).find(a=>a&&a.hp>0&&a.name==='マータ'&&a!==e.unit);
      if(mata){
        const redirected=Math.floor(e.amount/2);
        const remain=e.amount-redirected;
        log(`マータの効果でダメージの半分（${redirected}）を代わりに受けた。`,'good');
        out.push({...e,amount:remain});
        out.push({...e,unit:mata,side:'ally',amount:redirected});
        return;
      }
    }
    out.push(e);
  });
  return out;
}
async function applyDamageBatch(entries, options){
  const opt=options||{};
  const prepared=_splitEntriesForMata(entries)
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
    G._resolvingDamageBatchDeaths=(G._resolvingDamageBatchDeaths||0)+1;
    try{
      for(const r of deaths){
        if(r.side==='enemy') await processEnemyDeath(r.unit,G.enemies.indexOf(r.unit));
        else await processAllyDeath(r.unit);
      }
    } finally {
      G._resolvingDamageBatchDeaths=Math.max(0,(G._resolvingDamageBatchDeaths||0)-1);
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
  if(!unit||!['アラッサス','サイレン'].includes(unit.name)||!unit._attackEffectPending) return false;
  // アラッサス「全ての敵に1ダメージ」、サイレン「全てのキャラクターに1ダメージ」の両方とも対象
  return /全ての(敵|キャラクター)に1ダメージ/.test(String(unit.desc||unit.effectText||unit.effect||''));
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
  // ラミア：攻撃効果はダメージ処理より前に行う。対象を仲間にした場合、対象不在としてアラッサスと
  // 同様に攻撃を中断する（以降のダメージ適用は行わない）。
  _applyLamiaCaptureIfEligible(attacker,target);
  if(!attacker||attacker.hp<=0){
    result.attackerDiedBeforeContact=true;
    return result;
  }
  if(!target||target.hp<=0||!G.enemies.includes(target)){
    result.targetDiedBeforeContact=true;
    return result;
  }
  // ダメージの実適用はここでは行わない。反撃と同じ接触として_dealAttackDamageWithMutual側で
  // まとめてapplyDamageBatch()に渡すことで、防御側の死亡確定より前に反撃の可否を確定できるようにする。
  result.contacted=damage>0;
  return result;
}
// ラミア：攻撃：対象のキャラクターの攻撃力がこのキャラクターより低い場合、そのキャラクターを仲間にする。
function _applyLamiaCaptureIfEligible(attacker,target){
  if(!attacker||attacker.hp<=0||attacker.name!=='ラミア') return;
  if(!target||target.hp<=0||!G.enemies.includes(target)) return;
  if((target.atk||0)>=(attacker.atk||0)) return;
  const ei=G.enemies.indexOf(target);
  G.enemies[ei]=null;
  target.lane='front';
  // ラミアで仲間にしたキャラクターはメイン置き場由来ではない一時的な仲間のため、
  // 報酬フェイズ突入時・敗北時に取り除く対象として印を付けておく
  target._lamiaCaptured=true;
  const placed=_summonPanelUnitToFront(target,false)>=0||_summonPanelUnitToRear(target,false)>=0;
  if(placed){
    log(`${_lc(attacker.name,false)}の効果で${_lc(target.name,true)}を仲間にした。`,'good');
    requestBattleCompact();
  } else {
    G.enemies[ei]=target;
  }
}
// ラミアで一時的に仲間にしたキャラクターを、報酬フェイズ突入時・敗北時に取り除く
function _removeLamiaCapturedUnits(){
  if(!Array.isArray(G.allies)) return;
  G.allies=G.allies.map(a=>a&&a._lamiaCaptured?null:a);
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
    // defenderFirstStrikeが成立した場合、防御側の反撃は既に上の先制処理で1回分適用済みのため、
    // ここで二重に反撃ダメージを加算しない（タイタンの先制反撃が2回発動していたバグの原因）。
    const counterAmount=defenderFirstStrike?0:Math.max(0,defender.atk||0);
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

    // 反撃は本来の攻撃対象（primaryTarget）からのみ発生する。全体攻撃／三方向攻撃で追加ダメージを
    // 受けた他のキャラクターは反撃しない。反撃可否・値はダメージ適用前にスナップショットし、
    // このヒットで倒れたことを理由に反撃を取り消さない（先制で仕留めた場合のみ例外的に反撃を免除する）。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制');
    const primaryLethal=damage>0&&damage>=Math.max(0,primaryTarget.hp||0);
    const primaryCanCounter=!defenderFirstStrike&&liveTargets.includes(primaryTarget)&&!(attackerHasFirstStrike&&primaryLethal);
    const counterAmount=primaryCanCounter?Math.max(0,primaryTarget.atk||0):0;
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

// 全体攻撃：攻撃対象だけでなく、前衛・後衛を問わず相手陣営の生存キャラクター全員にダメージを与える。
function _targetsInSameAttackRow(target, list){
  if(!target) return [];
  return (list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul);
}

function _panelGridPos(idx){
  return {x:idx%7,y:Math.floor(idx/7)};
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
    if(targetPanel&&_isCharacterPanel(targetPanel)){
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
  const enh={atk:0,hp:0,keywords:[],weakenOnHit:0};
  const panels=_collectEnhancementPanelsForSlot(unit,slotIdx);
  panels.forEach(({panel})=>{
    enh.atk+=panel.adjacentAtkBonus||0;
    enh.hp+=panel.adjacentHpBonus||0;
    (panel.adjacentKeywords||[]).forEach(k=>{
      // 弱体化X：このキャラクター自身が弱体化するのではなく、攻撃/ダメージ効果で
      // 対象に弱体化Xを付与する常時能力として扱う（unit.keywordsには入れず別枠で加算する）
      const wm=/^弱体化(\d+)$/.exec(k);
      if(wm){ enh.weakenOnHit+=parseInt(wm[1],10)||0; return; }
      enh.keywords.push(k);
    });
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
  if(prev.weakenOnHit){
    unit.weakenOnHit=Math.max(0,(unit.weakenOnHit||0)-prev.weakenOnHit);
  }
  delete unit._adjacentPanelEnhancements;
  delete unit._adjacentPanelSignature;
}

function _applyAdjacentPanelEnhancements(unit, enh){
  if(!unit||!enh) return;
  const sig=JSON.stringify({atk:enh.atk||0,hp:enh.hp||0,keywords:[...(enh.keywords||[])].sort(),weakenOnHit:enh.weakenOnHit||0});
  if(unit._adjacentPanelSignature===sig) return;
  _clearAdjacentPanelEnhancements(unit);
  unit._adjacentPanelSignature=sig;
  unit._adjacentPanelEnhancements={atk:enh.atk||0,hp:enh.hp||0,keywords:[...(enh.keywords||[])],weakenOnHit:enh.weakenOnHit||0};
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
  if(enh.weakenOnHit){
    unit.weakenOnHit=(unit.weakenOnHit||0)+enh.weakenOnHit;
  }
  // シールドはonBattleStart()より後に接続されるパネル召喚キャラでも、接続時点で自前で付与しておく
  if((unit.keywords||[]).includes('シールド')&&!unit.shield){
    unit.shield=1;
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
    manaOnAttack:spec.manaOnAttack||0,
    manaOnInjury:spec.manaOnInjury||0,
    manaOnDeath:spec.manaOnDeath||0,
    manaCost:spec.manaCost||0,
    manaRepeat:!!spec.manaRepeat,
    goldOnBattleEnd:spec.goldOnBattleEnd||0,
    goldOnDeath:spec.goldOnDeath||0,
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
      manaOnAttack:panel.manaOnAttack||0,
      manaOnInjury:panel.manaOnInjury||0,
      manaOnDeath:panel.manaOnDeath||0,
      manaCost:Number(panel.manaCost||panel.costMana||0),
      manaRepeat:!!panel.manaRepeat,
      goldOnBattleEnd:panel.goldOnBattleEnd||0,
      goldOnDeath:panel.goldOnDeath||0,
      art:typeof getPanelArtPath==='function'?getPanelArtPath(panel):(panel.art||''),
      panelName:panel.name
    };
  }
  return null;
}

// 「色」はカード自体の見た目・種族分類（茶は廃止し黄に統一、紫を追加）にのみ使う汎用キー変換。
// マナ自体は色を持たない単一プールのため、マナの支払い・獲得には使わない。
function _colorKey(color){
  const c=String(color||'').trim().toLowerCase();
  if(c==='赤'||c==='red') return 'red';
  if(c==='青'||c==='blue') return 'blue';
  if(c==='緑'||c==='green') return 'green';
  if(c==='黄'||c==='茶'||c==='yellow') return 'yellow';
  if(c==='紫'||c==='purple') return 'purple';
  return '';
}
function _colorLabel(key){
  return {red:'赤',blue:'青',green:'緑',yellow:'黄',purple:'紫'}[key]||key;
}

// ── 「リーダー」＝メイン置き場⑥（後衛中央）から出撃したキャラクター。⑥が空/死亡の場合は後衛の誰か ──
function _getLeaderAlly(){
  const leaderSlot=(typeof MAIN_BOARD_REAR_SLOTS!=='undefined'&&MAIN_BOARD_REAR_SLOTS[1])||17;
  const bySlot=(G.allies||[]).find(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&a._mainBoardSlot===leaderSlot);
  if(bySlot) return bySlot;
  return (G.allies||[]).find(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&(a.lane||'front')==='rear')||null;
}
// 前衛レーンにおける左右隣接の味方（配列の昇順=左→右）
function _allyFrontOrder(){
  return (G.allies||[]).filter(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&(a.lane||'front')!=='rear');
}
function _rightNeighborAlly(unit){
  const order=_allyFrontOrder();
  const idx=order.indexOf(unit);
  if(idx<0||idx>=order.length-1) return null;
  return order[idx+1];
}
function _leftNeighborAlly(unit){
  const order=_allyFrontOrder();
  const idx=order.indexOf(unit);
  if(idx<=0) return null;
  return order[idx-1];
}

// ── 効果によるアドホックな味方召喚（例：センチネルの「赤ゴーレム」、スケルトンキングの「青スケルトン」）──
// 色が付いた名前（例：「赤ゴーレム」）は色部分を色分類に、残りを実際のキャラクター名として扱う。
// 召喚されるキャラクターは「オリジナル」でなければならない：プレイヤーがメイン置き場に同名の
// キャラクターパネルを所持していれば、そのインスタンス（隣接する強化パネルの効果を含む）を
// そのまま召喚する。所持していない場合のみ、PANEL_POOLの基礎値＋色別永続強化にフォールバックする。
function _spawnAdhocAllyUnit(name, atk, hp, isEnemySide){
  const m=String(name||'').match(/^([赤青緑黄紫])(.+)$/);
  const color=m?m[1]:'';
  const baseName=m?m[2]:String(name||'');
  const board=!isEnemySide&&typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const eq=board&&Array.isArray(board.equipment)?board.equipment:[];
  const ownedIdx=eq.findIndex(p=>p&&String(p.category||'')==='キャラクター'&&p.name===baseName);
  if(ownedIdx>=0){
    const panel=eq[ownedIdx];
    const spec=typeof _panelSummonSpec==='function'?_panelSummonSpec(panel):null;
    if(spec){
      const enh=typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(board,ownedIdx):{atk:0,hp:0,keywords:[]};
      // enh.keywordsは直後のapplyAdjacentPanelEnhancements()側で付与するため、ここでは渡さない
      // （両方に渡すと同じキーワードが二重に加算され、逆襲・闇の儀式等のカウント依存効果が
      // 意図した回数より多く発動してしまう）
      const summoned=_makePanelSummonUnit({...spec,panelName:panel.name},[]);
      _applyAdjacentPanelEnhancements(summoned,enh);
      const placedIdx=_summonPanelUnitToFront(summoned,isEnemySide);
      if(placedIdx>=0){
        _afterPanelSummon(summoned,isEnemySide);
        if(typeof renderAll==='function') renderAll();
      }
      return placedIdx>=0?summoned:null;
    }
  }
  const basePanel=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(p=>p&&p.name===baseName)
    :null;
  let finalAtk=Number(basePanel?.power??atk)||Number(atk)||0;
  let finalHp=Math.max(1,Number(basePanel?.life??hp)||Number(hp)||1);
  if(color){
    const key=_colorKey(color);
    const cb=G&&G.panelColorPermanentBuffs&&G.panelColorPermanentBuffs[key];
    if(cb){ finalAtk+=Number(cb.atk||0); finalHp+=Number(cb.hp||0); }
  }
  const unit=_makePanelSummonUnit({
    name:baseName,
    atk:finalAtk,
    hp:finalHp,
    color:color||(basePanel&&basePanel.color)||'',
    race:(basePanel&&basePanel.race)||'召喚',
    desc:basePanel&&basePanel.desc||'',
    keywords:basePanel&&basePanel.keywords||[],
    art:basePanel&&typeof getPanelArtPath==='function'?getPanelArtPath(basePanel):(basePanel&&basePanel.art)||''
  },[]);
  const placedIdx=_summonPanelUnitToFront(unit,isEnemySide);
  if(placedIdx>=0){
    _afterPanelSummon(unit,isEnemySide);
    if(typeof renderAll==='function') renderAll();
  }
  return placedIdx>=0?unit:null;
}

// ── 動的に再計算が必要な「常時」パッシブ（マナ数依存・リーダー依存）を反映する ──
// マナ・リーダーのステータスは増加方向にのみ追従する（減少時に強制的にHPを削らないための簡易措置）
function _recomputeDynamicPanelStats(){
  const leader=_getLeaderAlly();
  const manaCount=_ensureMana();
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0) return;
    const desc=String(u.desc||'');
    if(/常時：このキャラクターは\+X\/\+Xを得る。Xはマナの数に等しい。/.test(desc)){
      const prev=u._manaScaleApplied||0;
      const delta=manaCount-prev;
      if(delta){
        u.atk=Math.max(0,(u.atk||0)+delta); u.baseAtk=Math.max(0,(u.baseAtk||0)+delta);
        if(delta>0) addUnitHp(u,delta,'ally');
        u._manaScaleApplied=manaCount;
      }
    }
    if(/常時：XはリーダーのATK、HPの2倍に等しい。/.test(desc)&&leader&&leader!==u){
      // 自身の元々のステータス（シート値）とは無関係に、常にリーダーの2倍を絶対値として設定する
      const targetAtk=Math.max(0,(leader.atk||0)*2), targetHp=Math.max(1,(leader.maxHp||leader.hp||0)*2);
      const hpDiff=targetHp-(u.maxHp||0);
      u.atk=targetAtk; u.baseAtk=targetAtk;
      u.maxHp=targetHp;
      u.hp=hpDiff>0?(u.hp||0)+hpDiff:Math.min(u.hp||0,u.maxHp);
    }
  });
}
function _ensureMana(){
  G.mana=Number(G.mana)||0;
  return G.mana;
}
function _gainMana(amount, source){
  const n=Math.max(1,Number(amount)||1);
  G.mana=_ensureMana()+n;
  log(`${source?_lc(source,false):'マナ'}の効果でマナを${n}つ獲得した。`,'good');
  if(typeof renderManaHud==='function') renderManaHud();
  _checkManaCostSpells();
  _checkManaThresholdUnitEffects();
  _recomputeDynamicPanelStats();
}
// マナは消費しない共有蓄積値（G.mana）。カードごとに必要数（manaCost）到達回数を
// _manaFireCountで独立管理し、非repeatは1回のみ、manaRepeat=trueは閾値到達のたびに繰り返し発動する。
function _manaFireProgress(entity){
  const cost=Number(entity&&entity.manaCost)||0;
  if(!cost) return 0;
  return Math.floor(_ensureMana()/cost);
}
function _manaShouldFireAgain(entity){
  const cost=Number(entity&&entity.manaCost)||0;
  if(!cost) return false;
  const fired=entity._manaFireCount||0;
  if(!entity.manaRepeat&&fired>=1) return false;
  return _manaFireProgress(entity)>fired;
}
function _afterPanelSummon(unit,isEnemySide){
  if(!unit||isEnemySide) return;
  const wild=_unitEffectPanelCount(unit,'野生の力')||(_unitKeywordCount(unit,'野生の力')?1:0);
  if(wild) _gainMana(wild*2,unit.name);
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
      if(!card||!card.manaCost) return;
      while(_manaShouldFireAgain(card)){
        card._manaFireCount=(card._manaFireCount||0)+1;
        card._firedThisBattle=true;
        const effect=SPELL_EFFECTS[card.effectKey];
        if(typeof effect==='function') effect(card);
      }
    });
  }finally{
    G._checkingManaSpells=false;
    if(typeof renderHandEditor==='function') renderHandEditor();
  }
}
// ── 「Xマナ：効果」「Xマナ毎：効果」形式の説明文を持つキャラクター・強化パネル共通のマナ発動効果 ──
// マナは消費されない共有蓄積値。非repeatはXマナ到達で1戦闘1回、manaRepeatはXマナ貯まるたびに繰り返し発動する。
function _applyManaThresholdEffectText(unit,text,isEnemySide){
  const buff=String(text||'').match(/^\+(\d+)\s*\/\s*\+(\d+)を得る/);
  if(buff){
    const atk=parseInt(buff[1],10)||0, hp=parseInt(buff[2],10)||0;
    if(atk){ unit.atk=(unit.atk||0)+atk; unit.baseAtk=(unit.baseAtk||0)+atk; }
    if(hp) addUnitHp(unit,hp,isEnemySide?'enemy':'ally');
    log(`${_lc(unit.name,isEnemySide)}の効果が発動した。+${atk}/+${hp}を得た。`,isEnemySide?'bad':'good');
    return;
  }
  // センチネル等：「〇〇」（atk/hp）を召喚する。
  const summon=String(text||'').match(/^「(.+?)」（(\d+)\/(\d+)）を召喚する。/);
  if(summon&&!isEnemySide){
    const [,summonName,summonAtkStr,summonHpStr]=summon;
    log(`${_lc(unit.name,isEnemySide)}の効果が発動した。「${summonName}」を召喚する。`,'good');
    _spawnAdhocAllyUnit(summonName,parseInt(summonAtkStr,10)||0,parseInt(summonHpStr,10)||1,isEnemySide);
    return;
  }
  // サテュロス等：Xマナを得る。
  const manaGain=String(text||'').match(/^(\d+)マナを?得る/);
  if(manaGain){
    const n=parseInt(manaGain[1],10)||0;
    if(n) _gainMana(n,unit.name);
    return;
  }
  // ドワーフ等：ランダムなA色キャラクターは+X/+Yを得る。
  const randColorBuff=String(text||'').match(/^ランダムな([赤青緑黄紫])キャラクターは\+(\d+)\/\+(\d+)を得る/);
  if(randColorBuff){
    const [,buffColor,atkStr,hpStr]=randColorBuff;
    const side=isEnemySide?G.enemies:G.allies;
    const candidates=(side||[]).filter(u=>u&&u.hp>0&&String(u.color||'')===_normalizeColorTextForBattle(buffColor));
    if(candidates.length){
      const target=candidates[Math.floor(Math.random()*candidates.length)];
      const atk=parseInt(atkStr,10)||0, hp=parseInt(hpStr,10)||0;
      if(atk){ target.atk=(target.atk||0)+atk; target.baseAtk=(target.baseAtk||0)+atk; }
      if(hp) addUnitHp(target,hp,isEnemySide?'enemy':'ally');
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,isEnemySide)}は+${atk}/+${hp}を得た。`,isEnemySide?'bad':'good');
    }
    return;
  }
  // スペクター等：全てのA色キャラクターはATK+Xを得る。
  const allColorAtkBuff=String(text||'').match(/^全ての([赤青緑黄紫])キャラクターはATK\+(\d+)を得る/);
  if(allColorAtkBuff){
    const [,buffColor,atkStr]=allColorAtkBuff;
    const atk=parseInt(atkStr,10)||0;
    const side=isEnemySide?G.enemies:G.allies;
    (side||[]).forEach(u=>{
      if(u&&u.hp>0&&String(u.color||'')===_normalizeColorTextForBattle(buffColor)&&atk){
        u.atk=(u.atk||0)+atk; u.baseAtk=(u.baseAtk||0)+atk;
      }
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての${buffColor}キャラクターはATK+${atk}を得た。`,isEnemySide?'bad':'good');
    return;
  }
  // サイクロプス・ヴリコラカス等：（自身が）〇〇（キーワード）を得る。
  const kwGain=String(text||'').match(/^([^\s、。]+)を得る。?$/);
  if(kwGain){
    const kw=kwGain[1];
    if(!(unit.keywords||[]).includes(kw)) unit.keywords=[...(unit.keywords||[]),kw];
    log(`${_lc(unit.name,isEnemySide)}の効果で「${kw}」を得た。`,isEnemySide?'bad':'good');
    return;
  }
  log(`${_lc(unit.name,isEnemySide)}の効果が発動した。`,isEnemySide?'bad':'good');
}
function _normalizeColorTextForBattle(c){
  return String(c||'')==='茶'?'黄':String(c||'');
}
function _checkManaThresholdUnitEffects(){
  if(G._checkingManaUnitEffects) return;
  G._checkingManaUnitEffects=true;
  try{
    const visit=(unit,isEnemySide)=>{
      if(!unit||unit.hp<=0||!unit.manaCost) return;
      let fired=false;
      while(_manaShouldFireAgain(unit)){
        unit._manaFireCount=(unit._manaFireCount||0)+1;
        const m=String(unit.desc||'').match(/^\d+マナ(?:毎)?[:：]\s*(.+)/);
        _applyManaThresholdEffectText(unit,m?m[1]:'',isEnemySide);
        fired=true;
      }
      if(fired&&typeof renderAll==='function') renderAll();
    };
    (G.allies||[]).forEach(u=>visit(u,false));
    (G.enemies||[]).forEach(u=>visit(u,true));
  }finally{
    G._checkingManaUnitEffects=false;
  }
}

function _summonPanelUnitToFront(unit, isEnemySide){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,max-frontSlots));
  for(let i=frontSlots-1;i>=0;i--){
    if(!arr[i]){
      unit.lane='front';
      arr[i]=unit;
      return i;
    }
  }
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(!arr[i]){
      unit.lane='rear';
      arr[i]=unit;
      return i;
    }
  }
  return -1;
}

function _summonPanelUnitToRear(unit, isEnemySide){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,max-frontSlots));
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(!arr[i]){
      unit.lane='rear';
      arr[i]=unit;
      return i;
    }
  }
  return -1;
}

function applyNewPanelBattleStart(){
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const equip=board&&Array.isArray(board.equipment)?board.equipment:[];
  // メイン置き場①〜⑦の物理位置がそのまま出撃順を決める。前衛①②③④、後衛⑤⑥⑦。
  // _summonPanelUnitToFront/Rearは各レーンの右詰めで配置するため、並び順の先頭が左端に来るよう逆順で召喚する
  const deploySlotGroup=(slots,toRear)=>{
    for(let oi=slots.length-1;oi>=0;oi--){
      const idx=slots[oi];
      const panel=equip[idx];
      if(!panel) continue;
      const spec=_panelSummonSpec(panel);
      if(!spec) continue;
      const enh=_collectAdjacentEnhancements(board,idx);
      const contributingPanels=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(board,idx):[];
      for(let n=0;n<(spec.count||1);n++){
        // enh.keywordsは直後のapplyAdjacentPanelEnhancements()側で付与するため、ここでは渡さない
        // （両方に渡すと同じキーワードが二重に加算され、逆襲・闇の儀式等のカウント依存効果が
        // 意図した回数より多く発動してしまう）
        const summoned=_makePanelSummonUnit({...spec,panelName:panel.name},[]);
        _applyAdjacentPanelEnhancements(summoned,enh);
        summoned._mainBoardSlot=idx;
        // コピー召喚先にも強化カードの効果全文がフロー表示されるよう、寄与している強化パネルを複製して引き継ぐ
        if(contributingPanels.length){
          summoned.equipment=[null,...contributingPanels.map(({panel:p})=>({...clone(p),directions:['up','down','left','right']}))];
        }
        const placed=toRear?_summonPanelUnitToRear(summoned,false):_summonPanelUnitToFront(summoned,false);
        if(placed>=0){
          _afterPanelSummon(summoned,false);
          log(`${panel.name}が${_lc(summoned.name,false)}を召喚した。`,'good');
        }
      }
    }
  };
  deploySlotGroup((typeof MAIN_BOARD_FRONT_SLOTS!=='undefined'&&MAIN_BOARD_FRONT_SLOTS)||[0,2,4,6],false);
  deploySlotGroup((typeof MAIN_BOARD_REAR_SLOTS!=='undefined'&&MAIN_BOARD_REAR_SLOTS)||[15,17,19],true);
  compactBattleUnits();
  // タイタン：開戦：全ての敵に弱体2を与える。
  if((G.allies||[]).some(a=>a&&a.hp>0&&a.name==='タイタン')){
    (G.enemies||[]).forEach(e=>{
      if(e&&e.hp>0) e.weaken=(e.weaken||0)+2;
    });
    log('タイタンの効果で全ての敵は弱体2を得た。','good');
  }
  // スケルトンキング：開戦：「青スケルトン」を2体召喚する。
  // atk/hpはプレイヤーが「スケルトン」パネルを所持していない場合のみ使うフォールバック値
  // （_spawnAdhocAllyUnit側でPANEL_POOLの現在値を優先するため、シート更新時もここを直す必要はない）
  (G.allies||[]).filter(a=>a&&a.hp>0&&a.name==='スケルトンキング').forEach(sk=>{
    log(`${_lc(sk.name,false)}の効果で「青スケルトン」を2体召喚した。`,'good');
    _spawnAdhocAllyUnit('青スケルトン',4,2,false);
    _spawnAdhocAllyUnit('青スケルトン',4,2,false);
  });
  _recomputeDynamicPanelStats();
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
  const key=typeof _colorKey==='function'?_colorKey(color):String(color||'').trim();
  if(!key) return;
  const label=typeof _colorLabel==='function'?_colorLabel(key):String(color||'').trim();
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
  // リッチ：常時：味方の死亡効果は1回追加で発動する。（自陣営の全リッチが対象）
  const _lichCount=allies.filter(u=>u&&u.hp>0&&u.name==='リッチ').length;
  const deathRepeats=1+count('逆襲')+_lichCount;
  const darkFlame=count('闇の炎')*deathRepeats;
  for(let i=0;i<darkFlame;i++){
    const entries=foes
      .filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul)
      .map(t=>({unit:t,side:(G.allies||[]).includes(t)?'ally':'enemy',amount:1,source:unit}));
    await applyDamageBatch(entries);
    log(`${_lc(unit.name,unitIsEnemy)}の闇の炎が発動した。全ての敵キャラクターに1ダメージを与えた。`,unitIsEnemy?'bad':'good');
  }
  const rawDeathMana=unit.manaOnDeath ? (parseInt(unit.manaOnDeath,10)||0) : count('狂気');
  const madness=rawDeathMana*deathRepeats;
  for(let i=0;i<madness;i++) _gainMana(1,unit.name);
  ['赤','青','緑','黄','紫'].forEach(color=>{
    const n=count(`${color}強化`)*deathRepeats;
    for(let i=0;i<n;i++) _applyPermanentColorBuff(color,1,1,unit.name,unitIsEnemy);
  });
  // 「死亡：全てのA色キャラクターは+atk/+hpを得る。」（インプ・ゴースト等、色/数値はキーワードに埋め込まれている）
  for(let repeat=0;repeat<deathRepeats;repeat++){
    _unitPanelKeywords(unit).forEach(kw=>{
      const m=/^([赤青緑黄紫])全体強化(\d+)_(\d+)$/.exec(kw);
      if(!m) return;
      const [,buffColor,buffAtkStr,buffHpStr]=m;
      const buffAtk=parseInt(buffAtkStr,10)||0, buffHp=parseInt(buffHpStr,10)||0;
      allies.forEach(a=>{
        if(a&&a.hp>0&&String(a.color||'')===buffColor){
          if(buffAtk){ a.atk=(a.atk||0)+buffAtk; a.baseAtk=(a.baseAtk||0)+buffAtk; }
          if(buffHp) addUnitHp(a,buffHp,unitIsEnemy?'enemy':'ally');
        }
      });
      log(`${_lc(unit.name,unitIsEnemy)}の効果で全ての${buffColor}キャラクターは+${buffAtk}/+${buffHp}を得た。`,unitIsEnemy?'bad':'good');
    });
  }
  // マミー：死亡：1ゴールドを得る。（終戦Xゴールドと同じ数値パース結果を利用）
  if(unit.goldOnDeath){
    const gold=unit.goldOnDeath*deathRepeats;
    onGoldGained(gold);
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${gold}ゴールドを得た。`,unitIsEnemy?'bad':'good');
  }
  // スケルトン：死亡：ランダムな青キャラクターは+2/+1を得る。
  for(let i=0;i<deathRepeats&&unit.name==='スケルトン';i++){
    const candidates=allies.filter(a=>a&&a.hp>0&&a!==unit&&String(a.color||'')==='青');
    if(!candidates.length) break;
    const target=candidates[Math.floor(Math.random()*candidates.length)];
    target.atk=(target.atk||0)+2; target.baseAtk=(target.baseAtk||0)+2;
    addUnitHp(target,1,unitIsEnemy?'enemy':'ally');
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${_lc(target.name,unitIsEnemy)}は+2/+1を得た。`,unitIsEnemy?'bad':'good');
  }
  // レイス：死亡：ランダムな味方に「死亡：「青ゴースト」を召喚する。」を付与する。
  for(let i=0;i<deathRepeats&&unit.name==='レイス';i++){
    const candidates=allies.filter(a=>a&&a.hp>0&&a!==unit&&a.name!=='レイス'&&!a._grantedDeathSummon);
    if(!candidates.length) break;
    const target=candidates[Math.floor(Math.random()*candidates.length)];
    target._grantedDeathSummon={name:'青ゴースト',atk:5,hp:2};
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${_lc(target.name,unitIsEnemy)}に「死亡：「青ゴースト」を召喚する。」を付与した。`,unitIsEnemy?'bad':'good');
  }
  // デスナイト：死亡：「青ゴースト」を召喚する。
  for(let i=0;i<deathRepeats&&unit.name==='デスナイト';i++){
    log(`${_lc(unit.name,unitIsEnemy)}の効果で「青ゴースト」を召喚する。`,unitIsEnemy?'bad':'good');
    _spawnAdhocAllyUnit('青ゴースト',5,2,unitIsEnemy);
  }
  // バンシー：死亡：全ての敵にXダメージを与える。XはこのキャラクターのATKに等しい。
  if(unit.name==='バンシー'&&(unit.atk||0)>0){
    const dmgAmount=unit.atk||0;
    for(let i=0;i<deathRepeats;i++){
      const entries=foes
        .filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul)
        .map(t=>({unit:t,side:(G.allies||[]).includes(t)?'ally':'enemy',amount:dmgAmount,source:unit}));
      if(!entries.length) break;
      await applyDamageBatch(entries);
      log(`${_lc(unit.name,unitIsEnemy)}の効果で全ての敵に${dmgAmount}ダメージを与えた。`,unitIsEnemy?'bad':'good');
    }
  }
  // レイス由来：死亡：「青ゴースト」を召喚する。（逆襲・リッチ等の死亡効果複数回発動にも対応する）
  for(let i=0;i<deathRepeats&&unit._grantedDeathSummon;i++){
    const spec=unit._grantedDeathSummon;
    log(`${_lc(unit.name,unitIsEnemy)}の効果で「${spec.name}」を召喚する。`,unitIsEnemy?'bad':'good');
    _spawnAdhocAllyUnit(spec.name,spec.atk,spec.hp,unitIsEnemy);
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

function _onAllyInjuredByPanel(unit,actualDmg){
  if(!unit||unit.hp<=0) return false;
  let fired=false;
  if(_unitHasKeyword(unit,'治癒能力')){
    unit.hp+=2;
    unit.maxHp=(unit.maxHp||0)+2;
    log(`${_lc(unit.name,false)}の治癒能力が発動した。HP+2を得た。`,'good');
    fired=true;
  }
  const name=unit.name;
  if(name==='コボルド'){
    (G.allies||[]).forEach(a=>{
      if(a&&a.hp>0&&String(a.color||'')==='赤'){
        a.atk=(a.atk||0)+1; a.baseAtk=(a.baseAtk||0)+1;
        addUnitHp(a,1,'ally');
      }
    });
    log(`${_lc(unit.name,false)}の効果で全ての赤キャラクターは+1/+1を得た。`,'good');
    fired=true;
  }
  if(name==='アラクネ'){
    (G.enemies||[]).forEach(e=>{
      if(e&&e.hp>0){ e.atk=Math.max(0,(e.atk||0)-1); e.baseAtk=Math.max(0,(e.baseAtk||0)-1); }
    });
    log(`${_lc(unit.name,false)}の効果で全ての敵はATK-1を得た。`,'good');
    fired=true;
  }
  if(name==='サイクロプス'){
    const leader=_getLeaderAlly();
    if(leader){
      leader.atk=(leader.atk||0)+1; leader.baseAtk=(leader.baseAtk||0)+1;
      addUnitHp(leader,1,'ally');
      log(`${_lc(unit.name,false)}の効果でリーダーは+1/+1を得た。`,'good');
    }
    fired=true;
  }
  // センチネル：負傷：「赤ゴーレム」を召喚する。
  if(name==='センチネル'){
    log(`${_lc(unit.name,false)}の効果で「赤ゴーレム」を召喚する。`,'good');
    _spawnAdhocAllyUnit('赤ゴーレム',3,3,false);
    fired=true;
  }
  // ミノタウロス：負傷：直ちにランダムな敵に攻撃する。
  if(name==='ミノタウロス'){
    const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
    if(alive.length){
      const target=alive[Math.floor(Math.random()*alive.length)];
      log(`${_lc(unit.name,false)}が直ちに${_lc(target.name,true)}に攻撃した。`,'good');
      // このブロックは同期関数の中にあり呼び出し元をawait対応させると影響範囲が大きいため、
      // 攻撃モーションはawaitせずに再生を開始するだけに留める（演出がないよりは良い）
      if(typeof playAttackMotion==='function') playAttackMotion(unit,target,false);
      dealDmgToEnemy(target,Math.max(0,unit.atk||0),G.enemies.indexOf(target),unit);
    }
    fired=true;
  }
  if(name==='メデューサ'){
    const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
    if(alive.length&&actualDmg>0){
      const target=alive[Math.floor(Math.random()*alive.length)];
      // 通常攻撃のダメージ演出と同時に発生すると重なって見づらいため、少しタイミングをずらして再生する
      setTimeout(()=>{
        if(!target||target.hp<=0) return;
        log(`${_lc(unit.name,false)}の効果で${_lc(target.name,true)}に${actualDmg}ダメージを与えた。`,'good');
        dealDmgToEnemy(target,actualDmg,G.enemies.indexOf(target),null);
        if(typeof renderAll==='function') renderAll();
      },200);
    }
    fired=true;
  }
  return fired;
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
  // 毒は「攻撃するタイミング」ではなく「このキャラクターの手番」に発動するため、
  // ATK0で攻撃自体がスキップされる場合も先に処理する
  await _applyPoisonBeforeAttack(ally);
  if(!ally||ally.hp<=0) return;
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
  // 闇の儀式：常時：このキャラクターの攻撃効果は1回追加で発動する。（manaOnAttackも含む）
  if(ally.hp>0&&ally.manaOnAttack){
    const _ritualExtra=_unitKeywordCount(ally,'闇の儀式');
    for(let mi=0;mi<1+_ritualExtra;mi++) _gainMana(ally.manaOnAttack,ally.name);
  }

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
  // ファントム：攻撃：ランダムな発動済みのスペルを1つ発動する。
  if(ally.name==='ファントム'&&ally.hp>0){
    const firedSpells=(G.spellSlots||[]).filter(c=>c&&c._firedThisBattle);
    if(firedSpells.length){
      const card=firedSpells[Math.floor(Math.random()*firedSpells.length)];
      const effect=SPELL_EFFECTS[card.effectKey];
      if(typeof effect==='function'){
        log(`${_lc(ally.name,false)}の効果で「${card.name}」を再発動した。`,'good');
        effect(card);
      }
    }
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
      if(ally.hp>0&&ally.manaOnAttack){
        const _ritualExtra2=_unitKeywordCount(ally,'闇の儀式');
        for(let mi=0;mi<1+_ritualExtra2;mi++) _gainMana(ally.manaOnAttack,ally.name);
      }
      log(`${_lc(_battleLogName(ally,G.allies),false)}の${hi+2}段攻撃！ ${_lc(_battleLogName(curTgt,G.enemies),true)}に${attackDmg}ダメージを与えた。`,'good');
      await _dealAttackDamageWithMutual(ally,false,curTgt,G.enemies.indexOf(curTgt),attackDmg);
    }
  }

  renderAll();
  await sleep(180);
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  // 毒は「攻撃するタイミング」ではなく「このキャラクターの手番」に発動するため、
  // ATK0で攻撃自体がスキップされる場合も先に処理する
  await _applyPoisonBeforeAttack(enemy);
  if(!enemy||enemy.hp<=0) return;
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
  await sleep(180);
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
    if(unit.manaOnInjury) _gainMana(unit.manaOnInjury,unit.name);
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

// レムレース：負傷：このキャラクターをダメージを与えたキャラクターに変身する。
// 外観・ATK/HPとも、ダメージを与えたキャラクターの「その時点（＝現在）の状態」をそのまま引き継ぐ
// （開戦時の値ではなく、蓄積したバフ・被ダメージ後の現在HPを含む）。
function _applyLemuresInjuryTransform(unit){
  if(!unit||unit.hp<=0||unit.name!=='レムレース') return;
  const src=unit._lastDamageSource;
  if(!src||src===unit||src.hp<=0) return;
  const isEnemyKiller=(G.enemies||[]).includes(src);
  log(`${_lc(unit.name,false)}が${_lc(src.name,isEnemyKiller)}に変身した。`,'good');
  unit.name=src.name;
  unit.race=src.race||unit.race;
  unit.atk=Math.max(0,src.atk||0);
  unit.baseAtk=Math.max(0,src.baseAtk||src.atk||0);
  unit.maxHp=Math.max(1,src.maxHp||src.hp||1);
  unit.hp=Math.max(1,Math.min(unit.maxHp,src.hp||unit.maxHp));
  unit.color=src.color||unit.color;
  unit.keywords=[...(src.keywords||[])];
  unit.desc=src.desc||'';
  // 外観（アートワーク）もsrcのものに差し替える。unit.artが残っていると
  // 名前を変えても旧レムレースの絵のまま表示されてしまうため、明示的に上書き/削除する。
  if(src.art) unit.art=src.art; else delete unit.art;
  if(src.artCode) unit.artCode=src.artCode; else delete unit.artCode;
  if(src.imageNo) unit.imageNo=src.imageNo; else delete unit.imageNo;
  if(src.no) unit.no=src.no; else delete unit.no;
  delete unit._lastDamageSource;
  requestBattleCompact();
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
      _checkDragonContractInjury(unit);
      if(_fireAllyInjuryEffects(unit,0)) _bumpEtinOnAllyInjuryEffect();
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
  if(!G._resolvingDamageBatchDeaths) compactBattleUnitsAfterDeath();
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
  // ヴァンパイアロード：常時：キャラクターが死亡するたび、全ての味方はHP+1を得る。（陣営問わず発動）
  if((G.allies||[]).some(u=>u&&u.hp>0&&u.name==='ヴァンパイアロード')){
    (G.allies||[]).forEach(u=>{ if(u&&u.hp>0) addUnitHp(u,1,'ally'); });
    log('ヴァンパイアロードの効果で全ての味方はHP+1を得た。','good');
  }
  if(!deadIsEnemy){
    // デュラハン：常時：味方が死亡するたび、ランダムな敵に4ダメージを与える。
    (G.allies||[]).filter(u=>u&&u.hp>0&&u.name==='デュラハン').forEach(dh=>{
      const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
      if(!alive.length) return;
      const target=alive[Math.floor(Math.random()*alive.length)];
      log(`${_lc(dh.name,false)}の効果で${_lc(target.name,true)}に4ダメージを与えた。`,'good');
      dealDmgToEnemy(target,4,G.enemies.indexOf(target),dh);
    });
    // レヴナント：常時：味方が死亡するたび、このキャラクターは+1/+1を得る。
    (G.allies||[]).filter(u=>u&&u.hp>0&&u.name==='レヴナント').forEach(rv=>{
      rv.atk=(rv.atk||0)+1; rv.baseAtk=(rv.baseAtk||0)+1;
      addUnitHp(rv,1,'ally');
      log(`${_lc(rv.name,false)}の効果で+1/+1を得た。`,'good');
    });
    // エイドロン：常時：味方が3体死亡するたび、1マナを得る。
    if((G.allies||[]).some(u=>u&&u.hp>0&&u.name==='エイドロン')){
      G._eidolonDeathCount=(G._eidolonDeathCount||0)+1;
      if(G._eidolonDeathCount>=3){
        G._eidolonDeathCount=0;
        _gainMana(1,'エイドロン');
      }
    }
  }
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

  // 成長X：戦闘開始時、+X/+Xを得る（自身のみ・両陣営。同種の変数は合算する）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const growSum=(a.keywords||[]).filter(k=>/^成長\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
    if(!growSum) return;
    const x=growSum+(G.hasGoldenDrop?1:0);
    a.atk+=x; a.baseAtk=(a.baseAtk||0)+x;
    const _xhg=addUnitHp(a,x);
    log(`${_lc(a.name,false)}は成長し、+${x}/+${_xhg}を得た。`,'good');
  });
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    const growSum=(e.keywords||[]).filter(k=>/^成長\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
    if(!growSum) return;
    const x=growSum;
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
  // ノーム等：終戦：Xゴールドを得る。（パネル召喚キャラは直後に盤面から除去されるため先に処理する）
  (G.allies||[]).forEach(a=>{
    if(a&&a.hp>0&&a.goldOnBattleEnd){
      onGoldGained(a.goldOnBattleEnd);
      log(`${_lc(a.name,false)}の効果で${a.goldOnBattleEnd}ゴールドを得た。`,'good');
    }
  });
  G.allies=(G.allies||[]).map(u=>u&&u._panelSummoned?null:u);
  G.enemies=(G.enemies||[]).map(u=>u&&u._panelSummoned?null:u);
  // ラミアで一時的に仲間にしたキャラクターは、メイン置き場由来ではないため報酬フェイズへは持ち越さない
  _removeLamiaCapturedUnits();
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
    finishBattleAsVictory('敵を全滅させた！');
    return true;
  }
  return false;
}

// ── キーワード効果 ─────────────────────────────

function applyKeywordOnHit(attacker, target, damageDone, targetPreHp){
  const kws=attacker.keywords||[];
  if(!kws.length&&!(attacker.weakenOnHit>0)) return;
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  // 生命吸収：与えたダメージ分HPを増加する。対象の残りライフを上回るダメージの場合は、
  // 実際に削った分（＝対象の残りライフ）だけ回復する。対象を倒した場合も発動する。
  if(damageDone>0&&kws.includes('生命吸収')){
    const healAmt=targetPreHp!=null?Math.max(0,Math.min(damageDone,targetPreHp)):damageDone;
    if(healAmt>0){
      addUnitHp(attacker,healAmt,_isPlayerAlly?'ally':'enemy');
      log(`${_lc(attacker.name,!_isPlayerAlly)}の生命吸収：HP+${healAmt}`,_isPlayerAlly?'good':'bad');
    }
  }
  if(target.hp<=0) return;
  if(kws.includes('即死')){ target.hp=0; log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}を即死させた！`,'bad'); }
  // 毒牙X：命中時に毒Xを付与（加算）。同種の変数は合算する
  const erosionSum=kws.filter(k=>/^毒牙\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if((erosionSum>0||kws.includes('毒牙'))&&target.hp>0){
    const basePoison=erosionSum>0?erosionSum:Math.max(0,Math.floor(damageDone??attacker.atk??0));
    const pv=basePoison+_gdKw;
    target.poison=(target.poison||0)+pv;
    log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}に毒${pv}を与えた。`,'bad');
  }
  const poisonBladeSum=kws.filter(k=>/^毒\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(1),10)||0),0);
  if(poisonBladeSum>0&&target.hp>0){
    const pv=poisonBladeSum+_gdKw;
    target.poison=(target.poison||0)+pv;
    log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}に毒${pv}を与えた。`,'bad');
  }
  // 邪眼X：命中時にターゲットのATKをX減少。同種の変数は合算する
  const evilEyeSum=kws.filter(k=>/^邪眼\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if(evilEyeSum>0&&target.hp>0){
    const ev=evilEyeSum+_gdKw;
    target.atk=Math.max(0,target.atk-ev);
    target.baseAtk=Math.max(0,(target.baseAtk||target.atk)-ev);
    log(`${_lc(attacker.name,!_isPlayerAlly)}が${_lc(target.name,_isPlayerAlly)}の攻撃力を${ev}減少させ、${target.atk}にした。`,'bad');
  }
  // 弱体化X：このキャラクター自身ではなく、攻撃/ダメージ効果を与えた対象に「弱体X」を付与する
  // （弱体化＝付与する能力名、弱体X＝付与される状態。複数回付与された場合はXを加算して保持する。
  // 付与された弱体Xは_applyDamageState側で「受けるダメージ+X」として manifest する）
  if((attacker.weakenOnHit||0)>0&&target.hp>0){
    const wv=(attacker.weakenOnHit||0)+_gdKw;
    target.weaken=(target.weaken||0)+wv;
    log(`${_lc(attacker.name,!_isPlayerAlly)}が${_lc(target.name,_isPlayerAlly)}に弱体${wv}を与えた。`,'bad');
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
  const _preHpEnemy=e.hp;
  e.hp=Math.max(0,e.hp-actualDmgToEnemy);
  if(actualDmgToEnemy>0&&typeof playHitVfx==='function') playHitVfx('enemy',e,actualDmgToEnemy);
  if(actualDmgToEnemy>0&&typeof playSfx==='function') playSfx('hitLight',{group:'combat'});
  if(actualDmgToEnemy>0&&e.hp>0) _checkDragonContractInjury(e);
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
    // 生命吸収等は対象を倒した場合も発動するため、e.hp>0では絞り込まない
    if(srcUnit&&((srcUnit.keywords&&srcUnit.keywords.length)||srcUnit.weakenOnHit>0)){
      applyKeywordOnHit(srcUnit,e,actualDmgToEnemy,_preHpEnemy);
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
  // ギガンテス：常時：敵が死亡するたびに1マナを得る。
  (G.allies||[]).filter(a=>a&&a.hp>0&&a.name==='ギガンテス').forEach(g=>_gainMana(1,g.name));
  await _applyDeathKeywordEffects(e,true);
  // エリート判定：キーワードではなくインデックスで判定（ENEMY_POOLデータにエリートKWが混入しても誤発火しない）
  const _isActualElite=G._isEliteFight&&G._eliteIdx>=0&&eIdx===G._eliteIdx;
  if(_isActualElite) G._eliteKilled=true;
  log(`${_lc(e.name,true)}撃破！`,'gold');
  if(typeof onGoldGained==='function') onGoldGained(1);
  _onEnemyDeathPanelSummons(e);
  // ナグルファル：敵死亡でも+2/+1
  _onAnyCharDeath(e);
  if(!G._resolvingDamageBatchDeaths) compactBattleUnitsAfterDeath();
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

// showVictoryOverlay()はmain.jsで定義（スクリプト読み込み順の都合上こちらは重複のため削除済み）

// summon.js から統合（論理削除用）
function calcActions() {
  return 3;
}
function fireTrigger(trigger, sourceRingId) {
  // 指輪トリガー（廃止済み）の名残：安全な no-op として維持
}
