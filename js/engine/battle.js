// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, pool.js
// ═══════════════════════════════════════

let _isBossFight = false;

function _handleVictory(){
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showScreen('clear');
  } else {
    showVictoryOverlay();
  }
}

// ── リーダーボーナス（敵側）──────────────────────

function applyLeaderBonus(){
  const leader=G.enemies.find(e=>e.keywords&&e.keywords.includes('リーダー')&&e.hp>0);
  if(!leader) return;
  const bonus=Math.ceil(FLOOR_DATA[G.floor]?.grade||1);
  leader._leaderBonus=bonus;
  G.enemies.forEach(e=>{
    if(e.id!==leader.id&&e.hp>0){ e.atk+=bonus; e.hp+=bonus*2; e.maxHp+=bonus*2; }
  });
  log(`👑 リーダー「${leader.name}」が他の敵を強化（+${bonus}/+${bonus*2}）`,'bad');
}
function removeLeaderBonus(leader){
  if(!leader._leaderBonus) return;
  const bonus=leader._leaderBonus;
  G.enemies.forEach(e=>{
    if(e.id!==leader.id&&e.hp>0){ e.atk=Math.max(1,e.atk-bonus); e.hp=Math.max(1,e.hp-bonus*2); e.maxHp=Math.max(1,e.maxHp-bonus*2); }
  });
  log(`👑 リーダー死亡：強化が消えた`,'sys');
}

// ── 戦闘開始 ──────────────────────────────────

async function startBattle(){
  clearLog();

  // 宝箱・撤退フラグをリセット（前の戦闘の状態を持ち越さない）
  G._pendingTreasure=false;
  G._retreated=false;
  G._manaCycleUsed=false;

  // ソウル引き継ぎ（arcanaCarryGold は強欲アルカナ用のみ加算して消費）
  G.gold += G.arcanaCarryGold||0; G.arcanaCarryGold=0;

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

  const fd=FLOOR_DATA[G.floor];
  _isBossFight=!!(fd&&fd.boss);
  const wandIds=fd?.wands||[];
  G.commanderWands=wandIds.map(id=>COMMANDER_WAND_POOL&&COMMANDER_WAND_POOL.find(w=>w.id===id)).filter(Boolean);

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G.battleCounters={damage:0,deaths:0};

  G.enemies=generateEnemies(G.floor);
  G.enemies.forEach(e=>{ if(e) e.allyTarget=false; });
  G.moveMasks=generateMoveMasks();
  G.visibleMoves=[];
  G.fogNext=false;

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    a.sealed=0; a._dp=false; a.powerBroken=false;
    a.nullified=0; a.instadead=false;
    a._battleStartHp=a.hp;
  });

  log(`── 階層 ${G.floor} ──`,'sys');
  if(_isBossFight) log('⚠ ボス戦！','bad');
  log(`敵 ${G.enemies.length}体が現れた`,'em');
  applyLeaderBonus();

  // 戦闘開始時キャラクター効果
  onBattleStart();

  // 非ボス戦：司令官杖を1本発動
  if(!_isBossFight&&G.commanderWands&&G.commanderWands.length){
    const vw=G.commanderWands.filter(w=>w.commanderEffect!=='enemy_summon'||G.enemies.filter(e=>e.hp>0).length<6);
    if(vw.length) runCommanderWand(randFrom(vw));
  }

  updateHUD();
  renderAll();
  await nextTurn();
}

// ── ターンループ ───────────────────────────────

async function nextTurn(){
  G.turn++;
  updateHUD();
  log(`── ターン ${G.turn} ──`,'sys');
  if(_isBossFight) await commanderPhase();
  startPlayerPhase();
}

// ── 司令官フェイズ（ボス専用）────────────────────

function runCommanderWand(wand){
  if(!wand) return;
  const liveE=G.enemies.filter(e=>e.hp>0);
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  const bonus=Math.ceil(FLOOR_DATA[G.floor]?.grade||1);
  switch(wand.commanderEffect){
    case 'enemy_buff':
      liveE.forEach(e=>{ e.atk+=bonus; });
      log(`👹 敵司令官「${wand.name}」：全敵ATK+${bonus}`,'bad');
      break;
    case 'enemy_hate':
      if(liveA.length>0){
        G.allies.forEach(a=>{if(a)a.hate=false;});
        const eligible=liveA.filter(a=>!a.keywords||!a.keywords.includes('加護'));
        if(!eligible.length){ log(`👹 敵司令官「${wand.name}」：ヘイト（加護により無効）`,'sys'); break; }
        const t=randFrom(eligible); t.hate=true; t.hateTurns=99;
        log(`👹 敵司令官「${wand.name}」：${t.name}にヘイトを付与`,'bad');
      }
      break;
    case 'enemy_summon':{
      if(!liveE.length||liveE.length>=6) break;
      const avgAtk=Math.max(1,Math.round(liveE.reduce((s,e)=>s+e.atk,0)/liveE.length));
      const avgHp =Math.max(1,Math.round(liveE.reduce((s,e)=>s+e.hp, 0)/liveE.length));
      const ni=randi(0,ENEMY_NAMES.length-1);
      const ne={id:uid(),name:ENEMY_NAMES[ni],icon:ENEMY_ICONS[ni],atk:avgAtk,hp:avgHp,maxHp:avgHp,baseAtk:avgAtk,grade:rollEnemyGrade(G.floor),sealed:0,instadead:false,nullified:0,poison:0,_dp:false,shield:0,keywords:[],powerBroken:false};
      const ei=G.enemies.findIndex(e=>e.hp<=0);
      if(ei>=0) G.enemies[ei]=ne; else G.enemies.push(ne);
      log(`👹 敵司令官「${wand.name}」：${ne.name}(${avgAtk}/${avgHp})を召喚`,'bad');
      break;
    }
    case 'enemy_heal':
      if(liveE.length>0){ const t=randFrom(liveE); const hp=Math.ceil(FLOOR_DATA[G.floor]?.grade||1)*4; t.hp+=hp; t.maxHp+=hp; log(`👹 敵司令官「${wand.name}」：${t.name} HP+${hp}`,'bad'); }
      break;
    case 'enemy_shield':
      if(liveE.length>0){ const t=randFrom(liveE); t.shield=(t.shield||0)+1; log(`👹 敵司令官「${wand.name}」：${t.name}にシールド+1`,'bad'); }
      break;
  }
}

async function commanderPhase(){
  G.phase='commander';
  renderControls();
  log('👹 敵司令官フェイズ','bad');
  const liveE=G.enemies.filter(e=>e.hp>0);
  if(!liveE.length||!G.commanderWands||!G.commanderWands.length){ await sleep(300); return; }
  const pool=G.commanderWands.filter(w=>w.commanderEffect!=='enemy_summon'||liveE.length<6);
  if(!pool.length){ await sleep(300); return; }
  runCommanderWand(randFrom(pool));
  renderAll();
  await sleep(700);
}

// ── プレイヤーフェイズ ────────────────────────

function startPlayerPhase(){
  G.phase='player';
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G.spreadActive=false;
  applyTurnStart();
  // 毒処理後も仲間が全滅していたらゲームオーバー
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){ setTimeout(()=>gameOver(),300); return; }
  renderAll();
  const liveA=G.allies.filter(a=>a&&a.hp>0&&!a._isSoul);
  setHint(liveA.length===0?'仲間がいない！魔法で倒すか撤退を':'杖を使うかパスしてください');
}

// ── ターン開始時効果 ───────────────────────────

function applyTurnStart(){
  // パワーブレイク回復（1ターンのみ）
  G.enemies.forEach(e=>{
    if(e&&e.powerBroken){
      e.atk=e._savedAtk!==undefined?e._savedAtk:(e.baseAtk||0);
      e.powerBroken=false;
      delete e._savedAtk;
      log(`${e.name} のパワーブレイクが回復（ATK→${e.atk}）`,'sys');
    }
  });

  // 触媒の指輪による毒倍率
  const catRing=G.rings.find(r=>r&&r.unique==='catalyst');
  const catMult=catRing?(catRing.grade||1)+1:1;

  // 毒ティック（敵）
  G.enemies.forEach(e=>{
    if(e.poison>0&&e.hp>0){
      const dmg=e.poison*catMult;
      e.hp=Math.max(0,e.hp-dmg);
      log(`☠ ${e.name}が毒でHP-${dmg}${catMult>1?'（触媒×'+catMult+'）':''}（残HP:${e.hp}）`,'bad');
      if(e.hp<=0) processEnemyDeath(e,G.enemies.indexOf(e));
    }
  });
  if(checkInstantVictory()) return;
  // 毒ティック（仲間）
  G.allies.forEach(a=>{
    if(a&&a.poison>0&&a.hp>0){
      a.hp=Math.max(0,a.hp-a.poison);
      log(`☠ ${a.name}が毒でHP-${a.poison}（残HP:${a.hp}）`,'bad');
      if(a.hp<=0) processAllyDeath(a, G.allies.indexOf(a));
    }
  });
  // 指輪パッシブ（針など）
  G.rings.forEach(ring=>{
    if(!ring) return;
    if(ring.unique==='needle'){
      const dmg=G.turn||1; // X = 現在ターン数
      const ts=G.enemies.filter(e=>e.hp>0); if(!ts.length) return;
      ts.forEach(e=>{ dealDmgToEnemy(e,dmg,G.enemies.indexOf(e)); });
      log(`🎯 針の指輪：全敵に${dmg}ダメージ（ターン${G.turn}）`,'good');
      if(checkInstantVictory()) return;
    }
  });
  // エインセル①：ターン開始時、一番右の生存キャラにシールド+1
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    if(a.effect==='einsel'||a.effect==='einsel_shieldlost'){
      const liveIdxs=G.allies.map((u,i)=>u&&u.hp>0?i:-1).filter(i=>i>=0);
      if(liveIdxs.length){
        const r=G.allies[liveIdxs[liveIdxs.length-1]];
        r.shield=(r.shield||0)+1;
        log(`${a.name}：${r.name}にシールド+1`,'good');
      }
    }
  });
  // 城壁ATK同期
  syncWallAtk();
  // patience 指輪：battle_start トリガーをターン開始時に発動
  if(G.rings&&G.rings.some(r=>r&&r.unique==='patience')) fireTrigger('battle_start');
  checkSolitudeBuff();
}

// ── 戦闘フェイズ（インターリーブ攻撃）─────────────

async function battlePhase(){
  G.phase='enemy';
  renderControls();
  log(`── T${G.turn} 戦闘フェイズ ──`,'sys');

  for(let i=0;i<6;i++){
    // 味方 i 番目の攻撃
    const ally=G.allies[i];
    if(ally&&ally.hp>0&&!ally._isSoul){
      await allyAttackAction(ally,i);
      if(_checkBattleOver()) return;
    }
    // 敵 i 番目の攻撃
    const enemy=G.enemies[i];
    if(enemy&&enemy.hp>0){
      await enemyAttackAction(enemy,i);
      if(_checkBattleOver()) return;
    }
  }

  // 全攻撃後：勝敗判定
  if(G.enemies.filter(e=>e.hp>0).length===0){
    _onAllEnemiesDefeated();
    return;
  }
  const liveA=G.allies.filter(a=>a&&(a.hp>0));
  if(!liveA.length){ await sleep(200); gameOver(); return; }

  await sleep(400);
  await nextTurn();
}

function _checkBattleOver(){
  if(G.enemies.filter(e=>e.hp>0).length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!G.allies.filter(a=>a&&(a.hp>0)).length){ setTimeout(()=>gameOver(),200); return true; }
  return false;
}

function _onAllEnemiesDefeated(){
  log('全敵撃破！','gold');
  G.moveMasks.forEach((_,i)=>{ if(G.moveMasks[i]&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i); });
  applyVictoryBonuses();
  updateHUD(); renderAll();
  G.phase='reward';
  setTimeout(()=>_handleVictory(),600);
}

// ── 味方攻撃アクション ──────────────────────────

async function allyAttackAction(ally, allyIdx){
  if(ally.atk<=0) return; // ATK0は攻撃しない
  const liveE=G.enemies.filter(e=>e&&e.hp>0);
  if(!liveE.length) return;

  // アニメーション（代表ターゲット）
  const forcedT=liveE.find(e=>e.allyTarget);
  const target=forcedT||liveE[liveE.length-1];
  const eIdx=G.enemies.indexOf(target);
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[allyIdx];
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[eIdx];
  if(aSlot) aSlot.classList.add('glow-blue');
  if(eSlot) eSlot.classList.add('glow-red');
  await sleep(300);
  if(aSlot) aSlot.classList.remove('glow-blue');
  if(eSlot) eSlot.classList.remove('glow-red');

  if(ally.stealth){ ally.stealth=false; log(`${ally.name}の隠密が解除された`,'sys'); }

  // 攻撃時効果（ダメージを与える前に発動）
  if(ally.hp>0){
    // エルフ：攻撃時+1/±0（発動後のATKでダメージを与える）
    if(ally.effect==='elf_attack'||ally.effect==='elf_shield'){
      ally.atk+=1; ally.baseAtk+=1; log(`${ally.name}：攻撃時+1/±0`,'good');
    }
    // ブラウニー：攻撃時、全仲間±0/+1
    if(ally.effect==='brownie_attack'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=1; a.maxHp+=1; }});
      log(`${ally.name}：攻撃時→全仲間±0/+1`,'good');
    }
    // フォルニョート：攻撃時、全仲間+1/±0
    if(ally.effect==='forniot'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=1; a.baseAtk=(a.baseAtk||0)+1; }});
      log(`${ally.name}：攻撃時→全仲間+1/±0`,'good');
    }
  }

  // 全体攻撃キーワード：全ての敵を攻撃
  const isGlobal=ally.keywords&&ally.keywords.includes('全体攻撃');
  const attackTargets=isGlobal?[...liveE]:[target];

  attackTargets.forEach(t=>{
    const ti=G.enemies.indexOf(t);
    dealDmgToEnemy(t,ally.atk,ti,ally);
    // 敵の反撃
    if(t.hp>0&&t.keywords&&t.keywords.includes('反撃')&&ally.hp>0){
      dealDmgToAlly(ally,t.atk,allyIdx,t);
      log(`⚔ ${t.name}の反撃：${ally.name}に${t.atk}ダメ`,'bad');
    }
  });
  log(`${ally.name}(${ally.atk})→${isGlobal?'全敵':target.name}`);

  // 二段攻撃キーワード（ダメージ後に追加攻撃）
  if(ally.hp>0&&ally.keywords&&ally.keywords.includes('二段攻撃')){
    const t2=G.enemies.find(e=>e&&e.hp>0);
    if(t2){ dealDmgToEnemy(t2,ally.atk,G.enemies.indexOf(t2),ally); log(`${ally.name}：二段攻撃`,'good'); }
  }

  renderAll();
  await sleep(300);
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;

  // ターゲット選択：ヘイト持ち全員 or 最右端（隠密除外）
  const hateTgts=liveA.filter(a=>a.hate&&a.hateTurns>0&&!a.stealth);
  const visibleA=liveA.filter(a=>!a.stealth);
  const candidates=visibleA.length?visibleA:liveA;
  const targets=hateTgts.length>0?hateTgts:[candidates[candidates.length-1]];
  const primaryIdx=G.allies.indexOf(targets[0]);

  // アニメーション（先頭ターゲット代表）
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[enemyIdx];
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[primaryIdx];
  if(eSlot) eSlot.classList.add('glow-blue');
  if(aSlot) aSlot.classList.add('glow-red');
  await sleep(300);
  if(eSlot) eSlot.classList.remove('glow-blue');
  if(aSlot) aSlot.classList.remove('glow-red');

  const atkVal=enemy.sealed>0?0:enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;

  // 全ターゲットを攻撃
  const hitNames=[];
  const hitSet=new Set(); // 重複ダメージ防止（範囲攻撃の重複）
  targets.forEach(tgt=>{
    const aIdx=G.allies.indexOf(tgt);
    const rangeHit=[];
    if(atkVal>0&&enemy.keywords&&enemy.keywords.includes('範囲攻撃')){
      [-1,1].forEach(d=>{
        const adj=G.allies[aIdx+d];
        if(adj&&adj.hp>0&&!hitSet.has(adj.id)){ rangeHit.push({unit:adj,idx:aIdx+d}); }
      });
    }
    if(!hitSet.has(tgt.id)){
      dealDmgToAlly(tgt,atkVal,aIdx,enemy);
      hitSet.add(tgt.id);
    }
    rangeHit.forEach(h=>{ dealDmgToAlly(h.unit,atkVal,h.idx,enemy); hitSet.add(h.unit.id); });
    if(atkVal>0&&tgt.hp>0) applyKeywordOnHit(enemy,tgt);
    rangeHit.forEach(h=>{ if(atkVal>0) applyKeywordOnHit(enemy,h.unit); });
    hitNames.push(tgt.name);
  });

  log(`${enemy.name}(${atkVal})→${hitNames.join('・')}`);

  // ヘイトターン消費
  G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });

  renderAll();
  await sleep(300);
}

// ── 味方へのダメージ処理 ─────────────────────────

function dealDmgToAlly(unit, dmg, _fieldIdx, src){
  if(!unit||unit.hp<=0) return;

  // 反撃：攻撃を受けたら（0ダメージでも）生存中なら発動
  if(unit.counter&&src&&unit.hp>0){
    const srcIdx=G.enemies.indexOf(src);
    if(srcIdx>=0){ dealDmgToEnemy(src,unit.atk,srcIdx,unit); log(`⚔ ${unit.name}の反撃：${src.name}に${unit.atk}ダメ`,'good'); }
  }

  if(dmg<=0) return;

  // シールド（ATK0の攻撃では消費しない）
  if(dmg>0&&unit.shield>0){
    unit.shield--;
    log(`🛡 ${unit.name}のシールドがダメージを防いだ（残${unit.shield}）`,'sys');
    onAllyShieldLost();
    return;
  }

  // 呪詛加算
  const actualDmg=dmg+(unit.curse||0);
  unit.hp=Math.max(0,unit.hp-actualDmg);

  // 負傷トリガー（死亡判定は負傷前のHPで行う）
  const willDie=unit.hp<=0;
  if(unit.injury&&unit.hp>=0){
    triggerInjury(unit);
  }

  if(willDie){ unit.hp=0; processAllyDeath(unit); } // 負傷でHP回復しても死亡確定
}

// ── 味方の死亡処理 ──────────────────────────────

function processAllyDeath(unit){
  if(unit.hp>0) return;

  log(`${unit.name} が倒れた…`,'bad');
  G.battleCounters.deaths++;
  checkSolitudeBuff();

  // 石像効果
  if(unit.onDeath==='stone_death'){
    const stB=2;
    G.allies.forEach(a=>{ if(a&&a.id!==unit.id&&a.hp>0){ a.hp+=stB; a.maxHp+=stB; }});
    log(`🗿 石像効果：全仲間ライフ+${stB}`,'good');
  }

  // ナグルファル：キャラクター死亡ごとに+2/+1
  _onAnyCharDeath();
}

function _onAnyCharDeath(){
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&a.effect==='naglfar_ondeath'){
      a.atk+=2; a.baseAtk=(a.baseAtk||0)+2; a.hp+=1; a.maxHp+=1;
      log(`${a.name}：キャラ死亡→+2/+1`,'good');
    }
  });
}

// ── 負傷トリガー ──────────────────────────────

function triggerInjury(unit){
  switch(unit.injury){
    case 'mummy':{
      G._undeadHpBonus=(G._undeadHpBonus||0)+1;
      // 現在の全不死に+1/±0
      G.allies.forEach(a=>{
        if(a&&a.race==='不死'){ a.atk+=1; a.baseAtk=(a.baseAtk||a.atk); }
      });
      log(`${unit.name}：全不死が+1/±0（累計+${G._undeadHpBonus}）`,'good');
      break;
    }
    case 'freyr':{
      // 最も右の空きスロットに反撃持ちロイヤルガード(4/6)を召喚
      const rgDef={id:'c_royal_guard',name:'ロイヤルガード',race:'-',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'💂',desc:'反撃',counter:true};
      const freeIdx=G.allies.map((a,i)=>(!a||a.hp<=0)?i:-1).filter(i=>i>=0);
      if(freeIdx.length){
        const slot=freeIdx[freeIdx.length-1]; // 最も右
        G.allies[slot]=makeUnitFromDef(rgDef);
        log(`${unit.name}：ロイヤルガード(4/6+反撃)を召喚`,'good');
      }
      break;
    }
    case 'worm':{
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=1; a.hp+=1; a.maxHp+=1; }});
      log(`${unit.name}：負傷→全仲間+1/+1`,'good');
      break;
    }
    case 'minotaur':{
      const mts=G.enemies.filter(e=>e.hp>0);
      if(mts.length){ const mt=randFrom(mts); dealDmgToEnemy(mt,unit.atk,G.enemies.indexOf(mt),unit); log(`${unit.name}：負傷→ランダムな敵に攻撃`,'good'); }
      break;
    }
    case 'lizardman':{
      const ts=G.enemies.filter(e=>e.hp>0);
      if(ts.length){ const t=randFrom(ts); dealDmgToEnemy(t,unit.baseAtk,G.enemies.indexOf(t),unit); }
      break;
    }
    case 'kettcat':{
      const def={id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:1,atk:2,hp:4,cost:0,unique:false,icon:'🐈‍⬛',desc:''};
      // 死亡中ユニットのスロットも空き扱い（ただしケットシー自身のスロットは除外）
      const kIdx=G.allies.indexOf(unit);
      const ei=G.allies.findIndex((a,i)=>i!==kIdx&&(!a||a.hp<=0));
      if(ei>=0){ G.allies[ei]=makeUnitFromDef(def); log(`${unit.name}：ナイトキャットを召喚（スロット${ei}）`,'good'); }
      break;
    }
  }
}

// ── シールド喪失時 ──────────────────────────────

function onAllyShieldLost(){
  // エインセル②：味方がシールドを失うと+1/+2を得る
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&(a.effect==='einsel'||a.effect==='einsel_shieldlost')){
      a.atk+=1; a.baseAtk+=1; a.hp+=2; a.maxHp+=2;
      log(`${a.name}：シールド喪失→+1/+2`,'good');
    }
  });
}

// ── 戦闘開始時キャラクター効果 ───────────────────

function onBattleStart(){
  G.allies.forEach((a,i)=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'grimalkin_start':
        // 正面の敵（同インデックス）にヘイト付与
        { const fe=G.enemies[i];
          if(fe&&fe.hp>0){ fe.allyTarget=true; log(`${a.name}：正面の敵にヘイト付与`,'good'); } }
        break;
      // 旧効果（互換性）
      case 'mermaid_start':
        G.magicLevel++; log(`${a.name}：魔術レベル+1`,'good'); break;
      case 'imp_start':
        { const ei=G.spells.indexOf(null);
          if(ei>=0){ const item=drawConsumable(); if(item){ G.spells[ei]=item; log(`${a.name}：${item.name}を入手`,'good'); } } }
        break;
    }
  });
  // 憤激の指輪：戦闘開始時全仲間+3/±0
  G.rings.forEach(r=>{
    if(r&&r.unique==='fury_start'){
      const fb=3*(r.grade||1);
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=fb; a.baseAtk+=fb; }});
      log(`憤激の指輪：全仲間パワー+${fb}`,'good');
    }
  });
  // 絆の指輪：全仲間に「絆」キーワード付与
  if(G.rings.some(r=>r&&r.unique==='bond')){
    G.allies.forEach(a=>{ if(a&&a.hp>0){ if(!a.keywords) a.keywords=[]; if(!a.keywords.includes('絆')) a.keywords.push('絆'); }});
    log(`絆の指輪：全仲間に絆を付与`,'good');
  }
  // patience 指輪がない場合、battle_start 指輪トリガーを発火
  const _hasPatience=G.rings&&G.rings.some(r=>r&&r.unique==='patience');
  if(!_hasPatience) fireTrigger('battle_start');
}

// ── 戦闘終了時処理（勝利・撤退共通）────────────────

function onBattleEnd(){
  // スケルトン：戦闘終了時、死亡していればライフ1で復活
  G.allies.forEach(a=>{
    if(a&&a.hp<=0&&a.effect==='skeleton_revive'){
      a.hp=1;
      log(`${a.name}：ライフ1で復活`,'good');
    }
  });

  // ドラゴネット：3回目の戦闘終了時にワームへ変身
  G.allies.forEach((a,i)=>{
    if(!a||a.effect!=='dragonet_end') return;
    a._dragonetCount=(a._dragonetCount||0)+1;
    if(a._dragonetCount>=3){
      const worm=UNIT_POOL.find(u=>u.id==='c_worm');
      if(worm){
        const w=clone(worm); w._isChar=true; w.maxHp=w.hp;
        G.allies[i]=w;
        log(`🐲 ドラゴネット：3戦目→ワームに変身！`,'gold');
      }
    } else {
      log(`🐲 ドラゴネット：変身まで${3-a._dragonetCount}戦`,'sys');
    }
  });

  // ラミア：戦闘終了時、魔術レベル4につきソウル1を得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='lamia_end') return;
    const bonus=Math.floor((G.magicLevel||1)/4);
    if(bonus>0){ G.gold+=bonus; log(`🐍 ラミア：魔術Lv${G.magicLevel}→ソウル+${bonus}`,'gold'); }
  });

  // ノーム：戦闘終了時、2ソウルを得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='gnome_end') return;
    G.gold+=2; log(`🧌 ノーム：戦闘終了→ソウル+2`,'gold');
  });

  // 再生：戦闘終了時にHP+X（生存時のみ）
  G.allies.forEach(a=>{
    if(!a||!a.regen||a.hp<=0) return;
    const heal=a.regen;
    a.hp=Math.min(a.maxHp,a.hp+heal);
    log(`✨ ${a.name} 再生${heal}：ライフ+${heal}（${a.hp}）`,'good');
  });

  // 死亡ユニット（再生・復活で回復しなかった）をフィールドから除去
  for(let i=0;i<G.allies.length;i++){
    const a=G.allies[i];
    if(a&&a.hp<=0) G.allies[i]=null;
  }
}

// ── 勝利ボーナス ───────────────────────────────

function applyVictoryBonuses(){
  // 生命の指輪：全ての味方が±0/+1を得る
  G.rings.forEach(r=>{
    if(r&&r.unique==='life_reg'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=1; a.maxHp+=1; }});
      log(`生命の指輪：全仲間ライフ+1`,'good');
    }
  });

  // ステージ突破ボーナス
  const fl=G.floor;
  const stageBonus=fl>=15?4:fl>=10?3:fl>=5?2:1;
  G.gold+=stageBonus; G.earnedGold+=stageBonus;
  log(`ステージ突破ボーナス：${stageBonus}ソウル`,'gold');

  onBattleEnd();
}

// ── スペル使用後の勝利チェック ──────────────────

function checkInstantVictory(){
  if(G.phase==='player'&&G.enemies.filter(e=>e.hp>0).length===0){
    G.moveMasks.forEach((_,i)=>{ if(G.moveMasks[i]&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i); });
    applyVictoryBonuses();
    log('全敵撃破！','gold');
    updateHUD(); renderAll();
    G.phase='reward';
    setTimeout(()=>_handleVictory(),400);
    return true;
  }
  return false;
}

// ── キーワード効果 ─────────────────────────────

function applyKeywordOnHit(attacker, target){
  const kws=attacker.keywords||[];
  if(!kws.length||target.hp<=0) return;
  if(kws.includes('即死')){ target.hp=0; log(`💀 即死：${attacker.name}の攻撃で${target.name}が即死！`,'bad'); }
  if(kws.includes('毒')&&target.hp>0){ target.poison=(target.poison||0)+3; log(`☠ 毒：${attacker.name}が${target.name}に毒（HP-3/T）`,'bad'); }
  if(kws.includes('パワーブレイク')&&!target.powerBroken&&target.hp>0){
    const pbX=G.floor||1;
    target.powerBroken=true; target._savedAtk=target.atk;
    target.atk=Math.max(0,target.atk-pbX);
    log(`💢 パワーブレイク${pbX}：${attacker.name}が${target.name}のATK-${pbX}（${target._savedAtk}→${target.atk}）`,'bad');
  }
}

// ── 敵へのダメージ処理 ──────────────────────────

function applyPoisonOnDmg(e,srcUnit){
  if(!e||e.hp<=0) return;
  G.rings.forEach(pr=>{
    if(!pr||pr.unique!=='poison_aura') return;
    const pm=GRADE_MULT[pr.grade||1];
    e.poison=(e.poison||0)+3*pm;
    log('☠ '+e.name+'に毒+'+3*pm+'（合計HP-'+e.poison+'/T）','bad');
  });
  if(srcUnit&&srcUnit.enchants&&srcUnit.enchants.includes('猛毒')){
    e.poison=(e.poison||0)+3;
    log('☠ 猛毒：'+e.name+'に毒+3（合計HP-'+e.poison+'/T）','bad');
  }
}

function dealDmgToEnemy(e,dmg,eIdx,srcUnit){
  if(e.shield>0&&dmg>0){
    e.shield--;
    log(`🛡 ${e.name}のシールドがダメージを防いだ（残${e.shield}）`,'sys');
    return;
  }
  e.hp=Math.max(0,e.hp-dmg);
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
    applyPoisonOnDmg(e,srcUnit);
    // 味方キーワード（即死・毒・パワーブレイク等、possessで移動したキャラ含む）
    if(srcUnit&&srcUnit.keywords&&srcUnit.keywords.length&&e.hp>0){
      applyKeywordOnHit(srcUnit,e);
    }
  }
  if(e.hp<=0) processEnemyDeath(e,eIdx);
}

function processEnemyDeath(e,eIdx){
  if(e._dp) return;
  e._dp=true;
  if(e.keywords&&e.keywords.includes('エリート')) G._eliteKilled=true;
  if(e.keywords&&e.keywords.includes('リーダー')) removeLeaderBonus(e);
  const gold=1;
  G.earnedGold+=gold; G.gold+=gold;
  log(`${e.name} 撃破！ソウル+${gold}`,'gold');
  // 宝箱ドロップ（5%・1戦闘1個・撤退時は無効、強欲の指輪で2倍）
  // エリート戦ではエリート本体が宝箱を確定ドロップ（他の敵は落とさない）
  if(e.keywords&&e.keywords.includes('エリート')){
    G._pendingTreasure=true;
    log(`📦 ${e.name}が宝箱を落とした！`,'gold');
  } else if(!G._pendingTreasure&&!G._retreated&&!G._isEliteFight){
    const hasGreed=G.rings&&G.rings.some(r=>r&&r.unique==='greed');
    const rate=hasGreed?0.10:0.05;
    if(Math.random()<rate){
      G._pendingTreasure=true;
      G.moveMasks[eIdx]='chest'; // この敵スロットに宝箱を表示
      log(`📦 ${e.name}が宝箱を落とした！`,'gold');
    }
  }
  if(G.moveMasks[eIdx]&&!G.visibleMoves.includes(eIdx)){
    G.visibleMoves.push(eIdx);
    log(`移動マスが出現：${NODE_TYPES[G.moveMasks[eIdx]].label}`,'sys');
  }
  // ナグルファル：敵死亡でも+2/+1
  _onAnyCharDeath();
  updateHUD();
}

// ── 杖使用トリガー（キャラクター効果）───────────────

function onWandUsed(){
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'dwarf_wand':
        G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=1; b.baseAtk+=1; b.hp+=1; b.maxHp+=1; }});
        log(`ドワーフ：杖使用→全仲間+1/+1`,'good');
        break;
      case 'gremlin_wand':
        G.enemies.forEach(e=>{ if(e&&e.hp>0){ e.atk=Math.max(0,e.atk-1); }});
        log(`グレムリン：杖使用→全敵ATK-1`,'good');
        break;
      case 'jack_wand':{
        const alive=G.allies.filter(b=>b&&b.hp>0);
        if(alive.length){ const t=alive[Math.floor(Math.random()*alive.length)]; t.shield=(t.shield||0)+1; log(`ジャック：杖使用→${t.name}にシールド+1`,'good'); }
        break;
      }
    }
  });
}

// ── プレイヤーパス ────────────────────────────

async function playerPass(){
  if(G.phase!=='player') return;
  document.getElementById('btn-pass').textContent='パス';
  await battlePhase();
}

// ── 撤退 ──────────────────────────────────────

function retreat(){
  if(G.phase!=='player') return;
  if(!G.visibleMoves.some(i=>G.moveMasks[i])) return;
  log('撤退を選択','sys');
  G._retreated=true;
  applyVictoryBonuses();
  G.phase='reward';
  goToReward();
}

// ── 降伏 ──────────────────────────────────────

function surrender(){
  if(G.phase==='reward') return;
  log('降伏を選択','sys');
  gameOver();
}


// ── 勝利オーバーレイ ──────────────────────────

function showVictoryOverlay(){
  const ov=document.getElementById('victory-overlay');
  if(ov) ov.style.display='flex';
}
