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
  const bonus=FLOOR_DATA[G.floor]?.grade||1;
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

  // ソウルリセット
  G.gold = G.arcanaCarryGold||0; G.arcanaCarryGold=0;

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
  G.moveMasks=generateMoveMasks();
  G.visibleMoves=[];
  G.fogNext=false;

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    a.sealed=0; a.poison=0; a._dp=false; a.powerBroken=false;
    a.nullified=0; a.instadead=false;
    a.regenUsed=false;
    if(a._isSoul){
      // 前の戦闘で魂になったが復活済みのはず。念のためリセット
      a._isSoul=false;
    }
    a._injuryFired=false;
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
  const bonus=FLOOR_DATA[G.floor]?.grade||1;
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
      if(liveE.length>0){ const t=randFrom(liveE); const hp=(FLOOR_DATA[G.floor]?.grade||1)*4; t.hp+=hp; t.maxHp+=hp; log(`👹 敵司令官「${wand.name}」：${t.name} HP+${hp}`,'bad'); }
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
  renderAll();
  const liveA=G.allies.filter(a=>a&&a.hp>0&&!a._isSoul);
  setHint(liveA.length===0?'仲間がいない！魔法で倒すか撤退を':'杖を使うかパスしてください');
}

// ── ターン開始時効果 ───────────────────────────

function applyTurnStart(){
  // 毒ティック（敵）
  G.enemies.forEach(e=>{
    if(e.poison>0&&e.hp>0){
      e.hp=Math.max(0,e.hp-e.poison);
      log(`☠ ${e.name}が毒でHP-${e.poison}（残HP:${e.hp}）`,'bad');
      if(e.hp<=0) processEnemyDeath(e,G.enemies.indexOf(e));
    }
  });
  if(checkInstantVictory()) return;
  // 毒ティック（仲間）
  G.allies.forEach(a=>{
    if(a&&a.poison>0&&a.hp>0){
      a.hp=Math.max(0,a.hp-a.poison);
      log(`☠ ${a.name}が毒でHP-${a.poison}（残HP:${a.hp}）`,'bad');
    }
  });
  // 指輪パッシブ（針など）
  G.rings.forEach(ring=>{
    if(!ring) return;
    if(ring.unique==='needle'){
      const shots=ring.grade||1;
      for(let i=0;i<shots;i++){
        const ts=G.enemies.filter(e=>e.hp>0); if(!ts.length) break;
        dealDmgToEnemy(randFrom(ts),1,G.enemies.indexOf(randFrom(ts)));
      }
      if(shots>0) log(`🎯 針の指輪：敵にランダム1ダメ×${shots}`,'good');
      if(checkInstantVictory()) return;
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
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length){ await sleep(200); gameOver(); return; }

  await sleep(400);
  await nextTurn();
}

function _checkBattleOver(){
  if(G.enemies.filter(e=>e.hp>0).length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!G.allies.filter(a=>a&&a.hp>0).length){ setTimeout(()=>gameOver(),200); return true; }
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
  const target=G.enemies.find(e=>e&&e.hp>0);
  if(!target) return;
  const eIdx=G.enemies.indexOf(target);

  // アニメーション
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[allyIdx];
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[eIdx];
  if(aSlot) aSlot.classList.add('glow-blue');
  if(eSlot) eSlot.classList.add('glow-red');
  await sleep(300);
  if(aSlot) aSlot.classList.remove('glow-blue');
  if(eSlot) eSlot.classList.remove('glow-red');

  // 一方攻撃（攻撃側はノーダメージ）
  dealDmgToEnemy(target,ally.atk,eIdx,ally);
  log(`${ally.name}(${ally.atk})→${target.name}`);

  // キャラクター固有：攻撃時効果
  if(ally.hp>0){
    // ブラウニー：攻撃時、全仲間HP+1
    if(ally.effect==='brownie_attack'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=1; a.maxHp+=1; }});
      log(`ブラウニー：全仲間HP+1`,'good');
    }
    // フレイ：2回攻撃
    if(ally.effect==='freyr_double'){
      const t2=G.enemies.find(e=>e&&e.hp>0);
      if(t2){ dealDmgToEnemy(t2,ally.atk,G.enemies.indexOf(t2),ally); log(`${ally.name}：2回目の攻撃`,'good'); }
    }
    // フォルニョート：攻撃時 ATK+魔術レベル
    if(ally.effect==='forniot'){
      const bonus=G.magicLevel||0;
      if(bonus>0){ ally.atk+=bonus; ally.baseAtk+=bonus; log(`${ally.name}：ATK+${bonus}（魔術Lv${G.magicLevel}）`,'good'); }
    }
  }

  renderAll();
  await sleep(300);
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;

  // ターゲット選択（ヘイト→ランダム、隠密は候補から除外）
  const hateT=liveA.find(a=>a.hate&&a.hateTurns>0);
  const visibleA=liveA.filter(a=>!a.stealth);
  let tgt=hateT||(visibleA.length?randFrom(visibleA):randFrom(liveA));
  const aIdx=G.allies.indexOf(tgt);

  // アニメーション
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[enemyIdx];
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[aIdx];
  if(eSlot) eSlot.classList.add('glow-blue');
  if(aSlot) aSlot.classList.add('glow-red');
  await sleep(300);
  if(eSlot) eSlot.classList.remove('glow-blue');
  if(aSlot) aSlot.classList.remove('glow-red');

  const atkVal=enemy.sealed>0?0:enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;

  // 範囲攻撃チェック
  const rangeHit=[];
  if(atkVal>0&&enemy.keywords&&enemy.keywords.includes('範囲攻撃')){
    [-1,1].forEach(d=>{
      const adj=G.allies[aIdx+d];
      if(adj&&adj.hp>0){ rangeHit.push({unit:adj,idx:aIdx+d}); }
    });
  }

  // 一方攻撃（敵が攻撃→味方のみダメージ、反撃なし）
  dealDmgToAlly(tgt,atkVal,aIdx,enemy);
  rangeHit.forEach(h=>dealDmgToAlly(h.unit,atkVal,h.idx,enemy));

  log(`${enemy.name}(${atkVal})→${tgt.name}`);

  // キーワード効果（敵→味方）
  if(atkVal>0&&tgt.hp>=0) applyKeywordOnHit(enemy,tgt);
  rangeHit.forEach(h=>{ if(atkVal>0) applyKeywordOnHit(enemy,h.unit); });

  // ヘイトターン消費
  G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });

  renderAll();
  await sleep(300);
}

// ── 味方へのダメージ処理 ─────────────────────────

function dealDmgToAlly(unit, dmg, fieldIdx, src){
  if(!unit||unit.hp<=0) return;
  if(dmg<=0) return;

  // シールド
  if(unit.shield>0){
    unit.shield--;
    log(`🛡 ${unit.name}のシールドがダメージを防いだ（残${unit.shield}）`,'sys');
    onAllyShieldLost(unit);
    return;
  }

  // 呪詛加算
  const actualDmg=dmg+(unit.curse||0);
  unit.hp=Math.max(0,unit.hp-actualDmg);

  // 逆鱗・負傷トリガー（初回のみ）
  if(!unit._injuryFired&&unit.injury&&unit.hp>=0){
    unit._injuryFired=true;
    triggerInjury(unit,fieldIdx);
  }

  if(unit.hp<=0) processAllyDeath(unit,fieldIdx);

  // 反撃（counter フラグ持ちが生存時に攻撃者へ反撃）
  if(unit.counter&&src&&dmg>0&&unit.hp>0){
    const srcIdx=G.enemies.indexOf(src);
    if(srcIdx>=0){ dealDmgToEnemy(src,unit.atk,srcIdx,unit); log(`⚔ ${unit.name}の反撃：${src.name}に${unit.atk}ダメ`,'good'); }
  }
}

// ── 味方の死亡処理 ──────────────────────────────

function processAllyDeath(unit, fieldIdx){
  if(unit.hp>0) return;

  // 再生：魂に変身
  if(unit.regen&&!unit.regenUsed){
    unit.atk=0;
    unit.hp=1+(G._soulHpBonus||0);
    unit.maxHp=Math.max(unit.maxHp, unit.hp);
    unit._isSoul=true;
    unit.regenUsed=true;
    unit.poison=0; // 魂になると毒を解除
    unit._savedIcon=unit.icon;
    unit.icon='👻';
    log(`👻 ${unit.name}が魂に変身（戦闘後に復活）`,'good');
    return;
  }

  log(`${unit.name} が倒れた…`,'bad');
  G.battleCounters.deaths++;
  checkSolitudeBuff();

  // 石像効果
  if(unit.onDeath==='stone_death'){
    const stB=2;
    G.allies.forEach(a=>{ if(a&&a.id!==unit.id&&a.hp>0){ a.hp+=stB; a.maxHp+=stB; }});
    log(`🗿 石像効果：全仲間HP+${stB}`,'good');
  }
}

// ── 負傷トリガー ──────────────────────────────

function triggerInjury(unit, fieldIdx){
  switch(unit.injury){
    case 'lizardman':{
      // 逆鱗：ランダムな敵にATK分ダメ
      const ts=G.enemies.filter(e=>e.hp>0);
      if(ts.length>0){ const t=randFrom(ts); dealDmgToEnemy(t,unit.baseAtk,G.enemies.indexOf(t),unit); log(`⚔ ${unit.name}の逆鱗：${t.name}に${unit.baseAtk}ダメ`,'good'); }
      break;
    }
    case 'kettcat':{
      // ナイトキャット(2/4)を左端空きマスに召喚
      const def={id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:1,atk:2,hp:4,cost:0,unique:false,icon:'🐈‍⬛',desc:''};
      const ei=G.allies.indexOf(null);
      if(ei>=0){ G.allies[ei]=makeUnitFromDef(def); log(`🐱 ケットシー：ナイトキャット(2/4)を召喚`,'good'); }
      break;
    }
    case 'mummy':{
      // 以後、魂HPボーナス+1
      G._soulHpBonus=(G._soulHpBonus||0)+1;
      log(`マミー：以後の魂HP+1`,'good');
      break;
    }
    case 'worm':{
      // 全仲間+1/+1
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=1; a.hp+=1; a.maxHp+=1; }});
      log(`ワーム：全仲間+1/+1`,'good');
      break;
    }
    case 'freyr':{
      // 全キャラに1ダメ
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0&&a.id!==unit.id) dealDmgToAlly(a,1,ai,unit); });
      G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,1,ei,unit); });
      log(`${unit.name}：全キャラに1ダメ`,'bad');
      break;
    }
  }
}

// ── シールド喪失時 ──────────────────────────────

function onAllyShieldLost(unit){
  // エインセル：味方がシールドを失うと自身HP+2
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&a.effect==='einsel_shieldlost'){ a.hp+=2; a.maxHp+=2; log(`エインセル：HP+2`,'good'); }
  });
}

// ── 戦闘開始時キャラクター効果 ───────────────────

function onBattleStart(){
  G.allies.forEach((a,i)=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'mermaid_start':
        G.magicLevel++;
        log(`${a.name}：魔術レベル+1（現在${G.magicLevel}）`,'good');
        break;
      case 'grimalkin_start':
        // 右隣にヘイト付与
        if(G.allies[i+1]&&G.allies[i+1].hp>0){ G.allies[i+1].hate=true; G.allies[i+1].hateTurns=99; log(`${a.name}：右隣にヘイト付与`,'good'); }
        break;
      case 'imp_start':{
        // ランダムなアイテムを手札に追加
        const ei=G.spells.indexOf(null);
        if(ei>=0){ const item=drawConsumable(); if(item){ G.spells[ei]=item; log(`${a.name}：${item.name}を入手`,'good'); } }
        break;
      }
      case 'abadon_start':
        G.enemies.forEach(e=>{ if(e.hp>0) e.curse=(e.curse||0)+2; });
        log(`${a.name}：全敵に呪詛2`,'bad');
        break;
      case 'naglfar_start':{
        // 隣接キャラに再生付与
        [-1,1].forEach(d=>{
          const adj=G.allies[i+d];
          if(adj&&adj.hp>0&&!adj.regen){ adj.regen=true; adj.regenUsed=false; log(`${a.name}：${adj.name}に再生付与`,'good'); }
        });
        break;
      }
    }
  });
  // エルフ：シールドを持つ仲間 ATK+2
  if(G.allies.some(a=>a&&a.hp>0&&a.effect==='elf_shield')){
    G.allies.forEach(a=>{ if(a&&a.hp>0&&a.shield>0){ a.atk+=2; a.baseAtk+=2; } });
    log(`エルフ：シールド持ち仲間ATK+2`,'good');
  }
  // fury_start 指輪：戦闘開始時、全仲間+3/+3
  G.rings.forEach(r=>{
    if(r&&r.unique==='fury_start'){
      const fb=3*(r.grade||1);
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=fb; a.baseAtk+=fb; a.hp+=fb; a.maxHp+=fb; }});
      log(`憤激の指輪：全仲間+${fb}/+${fb}`,'good');
    }
  });
  // patience 指輪がない場合、battle_start 指輪トリガーを発火
  const _hasPatience=G.rings&&G.rings.some(r=>r&&r.unique==='patience');
  if(!_hasPatience) fireTrigger('battle_start');
}

// ── 戦闘終了時処理（勝利・撤退共通）────────────────

function onBattleEnd(){
  // ドラゴネット変身カウンタ
  G.allies.forEach((a,i)=>{
    if(!a||!a.effect) return;
    if(a.effect==='dragonet_end'){
      a._battleCount=(a._battleCount||0)+1;
      if(a._battleCount>=3){
        const wormDef=UNIT_POOL.find(u=>u.id==='c_worm');
        if(wormDef){
          G.allies[i]=makeUnitFromDef(wormDef);
          G.allies[i].hp=G.allies[i].maxHp; // 変身時はHP全回復
          log(`${a.name} → ワームに変身！`,'gold');
        }
      }
    }
    // フォルニョート：戦闘終了時 魔術レベル+2
    if(a.effect==='forniot'&&a.hp>0){
      G.magicLevel+=2;
      log(`${a.name}：魔術レベル+2（現在${G.magicLevel}）`,'good');
    }
    // ラミア：魔術レベル4ごとにソウル+1
    if(a.effect==='lamia_end'&&a.hp>0){
      const gain=Math.floor(G.magicLevel/4);
      if(gain>0){ G.gold+=gain; G.earnedGold+=gain; log(`${a.name}：ソウル+${gain}（魔術Lv${G.magicLevel}）`,'gold'); }
    }
  });

  // 魂の復活
  G.allies.forEach((a,i)=>{
    if(!a||!a._isSoul) return;
    a.hp=a._battleStartHp||a.maxHp;
    a.atk=a.baseAtk;
    a._isSoul=false;
    a.poison=0; // 復活時に毒をリセット
    if(a._savedIcon){ a.icon=a._savedIcon; delete a._savedIcon; }
    log(`✨ ${a.name}が復活！`,'good');
  });

  // 永久死亡ユニット（hp=0 かつ 魂でない）をフィールドから除去
  for(let i=0;i<G.allies.length;i++){
    const a=G.allies[i];
    if(a&&a.hp<=0&&!a._isSoul) G.allies[i]=null;
  }
}

// ── 勝利ボーナス ───────────────────────────────

function applyVictoryBonuses(){
  // 生命の指輪
  G.rings.forEach(r=>{
    if(r&&r.unique==='life_reg'){
      const gain=GRADE_MULT[r.grade||1];
      G.life=Math.min(20,G.life+gain);
      log(`生命の指輪：ライフ+${gain}`,'good');
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
    target.powerBroken=true; target._savedAtk=target.atk; target.atk=0;
    log(`💢 パワーブレイク：${attacker.name}が${target.name}のATK→0`,'bad');
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
  if(G.moveMasks[eIdx]&&!G.visibleMoves.includes(eIdx)){
    G.visibleMoves.push(eIdx);
    log(`移動マスが出現：${NODE_TYPES[G.moveMasks[eIdx]].label}`,'sys');
  }
  updateHUD();
}

// ── 杖使用トリガー（キャラクター効果）───────────────

function onWandUsed(){
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'dwarf_wand':
        G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=1; b.baseAtk+=1; }});
        log(`ドワーフ：杖使用→全仲間ATK+1`,'good');
        break;
      case 'gremlin_wand':
        G.enemies.forEach(e=>{ if(e.hp>0) e.curse=(e.curse||0)+1; });
        log(`グレムリン：杖使用→全敵に呪詛1`,'bad');
        break;
      case 'jack_wand':{
        const living=G.allies.filter(b=>b&&b.hp>0);
        if(living.length){ randFrom(living).shield=(randFrom(living).shield||0)+1; log(`ジャックランタン：杖使用→ランダムな仲間にシールド+1`,'good'); }
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

// ── 城壁ATK同期 ──────────────────────────────

function syncWallAtk(){
  const walls=G.allies.filter(a=>a&&a.hp>0&&a.injury==='wall_copy_atk');
  if(!walls.length) return;
  const maxAtk=G.allies.filter(a=>a&&a.hp>0&&a.injury!=='wall_copy_atk').reduce((m,a)=>Math.max(m,a.atk),0);
  walls.forEach(u=>{ u.atk=maxAtk; u.baseAtk=maxAtk; });
}

// ── 勝利オーバーレイ ──────────────────────────

function showVictoryOverlay(){
  const ov=document.getElementById('victory-overlay');
  if(ov) ov.style.display='flex';
}
