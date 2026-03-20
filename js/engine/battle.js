// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, summon.js, pool.js
// ═══════════════════════════════════════

// ── ボスフラグ（startBattleで設定・必ず参照より先に宣言）──
let _isBossFight = false;

// ── 勝利ルーティング：最終ボスならゲームクリア、それ以外は報酬オーバーレイ ──
function _handleVictory(){
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showScreen('clear');
  } else {
    showVictoryOverlay();
  }
}

// ── リーダーボーナス ──────────────────────────

function applyLeaderBonus(){
  const leader=G.enemies.find(e=>e.keywords&&e.keywords.includes('リーダー')&&e.hp>0);
  if(!leader) return;
  const bonus=Math.max(1,Math.floor(G.floor/4));
  leader._leaderBonus=bonus;
  G.enemies.forEach(e=>{
    if(e.id!==leader.id&&e.hp>0){
      e.atk+=bonus; e.hp+=bonus*2; e.maxHp+=bonus*2;
    }
  });
  log(`👑 リーダー「${leader.name}」が他の敵を強化（+${bonus}/+${bonus*2}）`,'bad');
}

function removeLeaderBonus(leader){
  if(!leader._leaderBonus) return;
  const bonus=leader._leaderBonus;
  G.enemies.forEach(e=>{
    if(e.id!==leader.id&&e.hp>0){
      e.atk=Math.max(1,e.atk-bonus);
      e.hp=Math.max(1,e.hp-bonus*2);
      e.maxHp=Math.max(1,e.maxHp-bonus*2);
    }
  });
  log(`👑 リーダー死亡：強化が消えた`,'sys');
}

function applyAllyLeaderBonus(){
  const leader=G.allies.find(a=>a.hp>0&&a.keywords&&a.keywords.includes('リーダー'));
  if(!leader) return;
  const bonus=Math.max(1,Math.floor(G.floor/4));
  leader._leaderBonus=bonus;
  G.allies.forEach(a=>{
    if(a.id!==leader.id&&a.hp>0){
      a.atk+=bonus; a.hp+=bonus*2; a.maxHp+=bonus*2;
    }
  });
  log(`👑 リーダー「${leader.name}」が他の仲間を強化（+${bonus}/+${bonus*2}）`,'good');
}

function removeAllyLeaderBonus(leader){
  if(!leader._leaderBonus) return;
  const bonus=leader._leaderBonus;
  G.allies.forEach(a=>{
    if(a.id!==leader.id&&a.hp>0){
      a.atk=Math.max(1,a.atk-bonus);
      a.hp=Math.max(1,a.hp-bonus*2);
      a.maxHp=Math.max(1,a.maxHp-bonus*2);
    }
  });
  log(`👑 リーダー仲間死亡：強化が消えた`,'sys');
}

// ── 戦闘開始 ──────────────────────────────────

async function startBattle(){
  clearLog();

  // 魂の残滓の一時グレードブーストを解除
  G.rings.forEach(r=>{ if(r&&r._tempGrade){ r.grade=Math.max(1,r.grade-1); delete r._tempGrade; } });

  // ソウルリセット（強欲秘術による持ち越し考慮）
  G.gold=G.arcanaCarryGold||0; G.arcanaCarryGold=0;

  // 報酬フェイズUIをリセット（インライン表示→非表示）
  const rInfo=document.getElementById('reward-info-bar');
  const rCards=document.getElementById('reward-cards-section');
  const rHand=document.getElementById('inline-hand-editor');
  const rMove=document.getElementById('move-inline');
  const allySection=document.getElementById('ally-section');
  if(rInfo) rInfo.style.display='none';
  if(rCards) rCards.style.display='none';
  if(rHand) rHand.style.display='none';
  if(rMove) rMove.style.display='none';
  if(allySection) allySection.style.display='';

  // isBossFightを最初に確定（参照より先に必ず宣言）
  const fd=FLOOR_DATA[G.floor];
  _isBossFight=!!(fd&&fd.boss);

  // 司令官杖をセットアップ
  const wandIds=fd?.wands||[];
  G.commanderWands=wandIds.map(id=>COMMANDER_WAND_POOL.find(w=>w.id===id)).filter(Boolean);

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1;
  G.battleCounters={damage:0,deaths:0,summons:0,deathTriggerNext:10,damageTriggerNext:12};

  G.enemies=generateEnemies(G.floor);
  G.moveMasks=generateMoveMasks();
  G.visibleMoves=[];
  G.fogNext=false;
  summonAllies();

  log(`── 階層 ${G.floor} ──`,'sys');
  if(_isBossFight) log('⚠ ボス戦！','bad');
  log(`敵 ${G.enemies.length}体が現れた`,'em');
  applyLeaderBonus();
  applyAllyLeaderBonus();

  // 非ボス戦：戦闘開始時に司令官杖を1本発動
  if(!_isBossFight && G.commanderWands.length){
    const validWands=G.commanderWands.filter(w=>w.commanderEffect!=='enemy_summon'||G.enemies.filter(e=>e.hp>0).length<6);
    if(validWands.length) runCommanderWand(randFrom(validWands));
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

  // 撤退判定（司令官フェイズ開始前）
  if(checkInstantRetreat()) return;

  // 敵司令官フェイズ（ボス戦のみ）
  if(_isBossFight) await commanderPhase();

  // プレイヤーフェイズ
  startPlayerPhase();
}

// ── 撤退チェック ──────────────────────────────

function checkInstantRetreat(){
  if(G.turn<=1) return false;
  // 最終ボス戦では撤退不可
  if(_isBossFight && G.floor===FLOOR_DATA.length-1) return false;
  const liveE=G.enemies.filter(e=>e.hp>0);
  if(!liveE.length) return false;
  const allyAtk=G.allies.filter(a=>a.hp>0).reduce((s,a)=>s+a.atk,0);
  const enemyHp=liveE.reduce((s,e)=>s+e.hp,0);
  if(allyAtk<enemyHp*2) return false;

  log('⚡ 戦力差により敵が撤退！','gold');
  liveE.forEach(e=>{
    const idx=G.enemies.indexOf(e);
    if(!e._dp){
      e._dp=true; e.hp=0;
      G.earnedGold+=(e.grade||1); G.gold+=(e.grade||1);
      if(G.moveMasks[idx]&&!G.visibleMoves.includes(idx)) G.visibleMoves.push(idx);
    }
  });
  log(`全移動マスが開放された`,'gold');
  applyVictoryBonuses();
  updateHUD(); renderAll();
  G.phase='reward';
  setTimeout(()=>_handleVictory(),600);
  return true;
}

// ── 司令官杖を実行（ボス・非ボス共通）────────

function runCommanderWand(wand){
  const liveE=G.enemies.filter(e=>e.hp>0);
  const liveA=G.allies.filter(a=>a.hp>0);
  const bonus=Math.max(1,Math.floor(G.floor/5));
  switch(wand.commanderEffect){
    case 'enemy_buff':
      liveE.forEach(e=>{ e.atk+=bonus; });
      log(`👹 敵司令官「${wand.name}」：全敵ATK+${bonus}`,'bad');
      break;
    case 'enemy_hate':
      if(liveA.length>0){
        G.allies.forEach(a=>a.hate=false);
        const eligible=liveA.filter(a=>!a.keywords||!a.keywords.includes('加護'));
        if(eligible.length===0){ log(`👹 敵司令官「${wand.name}」：ヘイト（加護により無効）`,'sys'); break; }
        const t=randFrom(eligible);
        t.hate=true; t.hateTurns=99;
        log(`👹 敵司令官「${wand.name}」：${t.name}にヘイトを付与`,'bad');
      }
      break;
    case 'enemy_summon':{
      if(!liveE.length||liveE.length>=6) break;
      const avgAtk=Math.max(1,Math.round(liveE.reduce((s,e)=>s+e.atk,0)/liveE.length));
      const avgHp =Math.max(1,Math.round(liveE.reduce((s,e)=>s+e.hp, 0)/liveE.length));
      const ni=randi(0,ENEMY_NAMES.length-1);
      const ne={
        id:uid(),name:ENEMY_NAMES[ni],icon:ENEMY_ICONS[ni],
        atk:avgAtk,hp:avgHp,maxHp:avgHp,baseAtk:avgAtk,
        grade:rollEnemyGrade(G.floor),
        sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
        shield:0,keywords:[],powerBreak:false
      };
      const emptyIdx=G.enemies.findIndex(e=>e.hp<=0);
      if(emptyIdx>=0) G.enemies[emptyIdx]=ne; else G.enemies.push(ne);
      log(`👹 敵司令官「${wand.name}」：${ne.name}(${avgAtk}/${avgHp})を召喚`,'bad');
      break;
    }
    case 'enemy_heal':
      if(liveE.length>0){
        const t=randFrom(liveE);
        const hp=G.floor*2;
        t.hp+=hp; t.maxHp+=hp;
        log(`👹 敵司令官「${wand.name}」：${t.name} HP+${hp}`,'bad');
      }
      break;
    case 'enemy_shield':
      if(liveE.length>0){
        const t=randFrom(liveE);
        t.shield=(t.shield||0)+1;
        log(`👹 敵司令官「${wand.name}」：${t.name}にシールド+1`,'bad');
      }
      break;
  }
}

// ── 敵司令官フェイズ（ボス専用・毎ターン）──────

async function commanderPhase(){
  G.phase='commander';
  renderControls();
  log('👹 敵司令官フェイズ','bad');
  const liveE=G.enemies.filter(e=>e.hp>0);
  if(!liveE.length){ await sleep(300); return; }
  if(!G.commanderWands.length){ await sleep(300); return; }
  const pool=G.commanderWands.filter(w=>w.commanderEffect!=='enemy_summon'||liveE.length<6);
  if(!pool.length){ await sleep(300); return; }
  runCommanderWand(randFrom(pool));
  renderAll();
  await sleep(700);
}

// ── プレイヤーフェイズ開始 ────────────────────

function startPlayerPhase(){
  G.phase='player';
  G.actionsLeft=G.actionsPerTurn;
  G.spreadActive=false;
  applyTurnStart();
  renderAll();
  setHint(G.allies.filter(a=>a.hp>0).length===0
    ?'仲間がいない！魔法で倒すか撤退を'
    :'魔法カードを使うかパスしてください');
}

// ── ターン開始時効果 ───────────────────────────

function applyTurnStart(){
  // 毒ティック（敵）
  const catRing=G.rings.find(r=>r&&r.unique==='catalyst');
  const catMult=catRing?(catRing.grade||1)+1:1;
  G.enemies.forEach(e=>{
    if(e.poison>0&&e.hp>0){
      const pdmg=Math.round(e.poison*catMult);
      e.hp=Math.max(0,e.hp-pdmg);
      log(`☠ ${e.name}が毒でHP-${pdmg}${catMult>1?' (x'+catMult+'倍)':''}（残HP:${e.hp}）`,'bad');
      if(e.hp<=0) processEnemyDeath(e,G.enemies.indexOf(e));
    }
  });
  if(checkInstantVictory()) return;

  // 毒ティック（仲間）
  G.allies.forEach(a=>{
    if(a.poison>0&&a.hp>0){
      a.hp=Math.max(0,a.hp-a.poison);
      log(`☠ ${a.name}が毒でHP-${a.poison}（残HP:${a.hp}）`,'bad');
    }
  });

  // パッシブ：針
  G.rings.forEach(ring=>{
    if(!ring) return;
    if(ring.unique==='needle'){
      const shots=ring.grade||1;
      for(let i=0;i<shots;i++){
        const ts=G.enemies.filter(e=>e.hp>0); if(!ts.length) break;
        const te=randFrom(ts);
        dealDmgToEnemy(te,1,G.enemies.indexOf(te));
      }
      if(shots>0) log(`🎯 針の指輪：敵にランダム1ダメ×${shots}`,'good');
      if(checkInstantVictory()) return;
    }
  });

  // turn_start 召喚トリガー
  G.rings.forEach(ring=>{
    if(!ring||ring.kind!=='summon'||ring.trigger!=='turn_start') return;
    triggerSummon(ring);
  });

  // on_outnumbered
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!=='on_outnumbered') return;
    const ac=G.allies.filter(a=>a.hp>0).length;
    const ec=G.enemies.filter(e=>e.hp>0).length;
    if(ec>=Math.max(1,ac)*3) triggerSummon(ring);
  });

  // 我慢の契約：「戦闘開始時」の契約効果をターン開始時にも発動
  if(G.rings.some(r=>r&&r.unique==='patience')){
    G.rings.forEach(ring=>{
      if(!ring||ring.kind!=='summon'||ring.trigger!=='battle_start') return;
      triggerSummon(ring);
    });
    log('我慢の契約：戦闘開始時効果を発動','good');
  }

  // 孤高の契約：前ターンのバフを除去してから再評価
  G.allies.forEach(a=>{
    if(a._solBuff){
      a.atk=Math.round(a.atk/2);
      a.maxHp=Math.round(a.maxHp/2);
      a.hp=Math.min(a.hp,a.maxHp);
      a._solBuff=false;
    }
  });
  const solRing=G.rings.find(r=>r&&r.unique==='solitude');
  if(solRing){
    const live=G.allies.filter(a=>a.hp>0);
    if(live.length===1){
      const a=live[0];
      a.atk*=2; a.maxHp*=2; a.hp=Math.min(a.hp*2,a.maxHp);
      a._solBuff=true;
      log(`孤高の契約：${a.name} ATK/HP×2`,'good');
    }
  }
}

// ── 勝利ボーナス ───────────────────────────────

function applyVictoryBonuses(){
  G.rings.forEach(r=>{
    if(r&&r.unique==='life_reg'){
      const gain=GRADE_MULT[r.grade||1];
      G.life=Math.min(20,G.life+gain);
      log(`生命の指輪：ライフ+${gain}`,'good');
    }
  });
  G.rings.forEach((ring,hi)=>{
    if(!ring||ring.unique!=='buff_adj') return;
    [-1,1].forEach(d=>{
      const adj=G.rings[hi+d];
      if(adj&&adj.kind==='summon'){
        if(!G.buffAdjBonuses[adj.id]) G.buffAdjBonuses[adj.id]={atk:0,hp:0};
        const bonus=ring.grade||1;
        G.buffAdjBonuses[adj.id].atk+=bonus;
        G.buffAdjBonuses[adj.id].hp+=bonus;
        log(`増幅：${adj.name}に+${bonus}/+${bonus}蓄積（累計+${G.buffAdjBonuses[adj.id].atk}）`,'sys');
      }
    });
  });
}

// ── スペル使用中の即時勝利判定 ─────────────────

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

// ── キーワード効果：効果を持つユニットがダメージを与えた時に発動 ──

function applyKeywordOnHit(attacker, target){
  const kws=attacker.keywords||[];
  if(!kws.length||target.hp<=0) return;
  if(kws.includes('即死')){
    target.hp=0;
    log(`💀 即死：${attacker.name}の攻撃で${target.name}が即死！`,'bad');
  }
  if(kws.includes('毒')&&target.hp>0){
    target.poison=(target.poison||0)+3;
    log(`☠ 毒：${attacker.name}が${target.name}に毒付与（HP-3/T）`,'bad');
  }
  if(kws.includes('パワーブレイク')&&!target.powerBroken&&target.hp>0){
    target.powerBroken=true; target._savedAtk=target.atk; target.atk=0;
    log(`💢 パワーブレイク：${attacker.name}が${target.name}のATK→0（次ターンまで）`,'bad');
  }
}

// ── ダメージ処理 ───────────────────────────────

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
    // シールドで防がれた場合は毒・キーワード効果なし
    return;
  }
  e.hp=Math.max(0,e.hp-dmg);
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    onDamageCount();
    applyPoisonOnDmg(e,srcUnit); // ring check は常時動作、enchant check は srcUnit がある場合のみ
    G.rings.forEach(fr=>{
      if(!fr||fr.unique!=='fury_passive') return;
      const fm=GRADE_MULT[fr.grade||1];
      G.allies.forEach(a=>{ if(a.hp>0) a.atk+=fm; });
    });
  }
  if(e.hp<=0) processEnemyDeath(e,eIdx);
}

function processEnemyDeath(e,eIdx){
  if(e._dp) return;
  e._dp=true;
  if(e.keywords&&e.keywords.includes('リーダー')) removeLeaderBonus(e);
  const gold=e.grade||1;
  G.earnedGold+=gold; G.gold+=gold;
  log(`${e.name} 撃破！ソウル+${gold}`,'gold');
  if(G.moveMasks[eIdx]&&!G.visibleMoves.includes(eIdx)){
    G.visibleMoves.push(eIdx);
    log(`移動マスが出現：${NODE_TYPES[G.moveMasks[eIdx]].label}`,'sys');
  }
  updateHUD();
}

// ── プレイヤーパス → 敵攻撃フェイズ ──────────

async function playerPass(){
  if(G.phase!=='player') return;
  document.getElementById('btn-pass').textContent='パス';
  G.phase='enemy';
  renderControls();
  await enemyAttackPhase();
}

// ── 敵キャラ攻撃フェイズ ─────────────────────

async function enemyAttackPhase(){
  log(`── T${G.turn} 敵攻撃フェイズ ──`);
  const living=()=>G.allies.filter(a=>a.hp>0);
  const hateTarget=()=>living().find(a=>a.hate&&a.hateTurns>0);

  for(const e of G.enemies){
    if(e.hp<=0) continue;
    if(e.sealed>0){ e.sealed--; log(`${e.name} は封印中`); continue; }
    const atkVal=e.nullified>0?0:e.atk;
    if(e.nullified>0) e.nullified--;

    const lv=living();
    if(lv.length===0){
      const directDmg=e.grade||1;
      G.life=Math.max(0,G.life-directDmg);
      log(`${e.name} がプレイヤーを直接攻撃！ライフ-${directDmg}`,'bad');
      updateHUD();
      if(G.life<=0){ renderAll(); await sleep(200); gameOver(); return; }
      continue;
    }

    // 攻撃対象（ヘイト優先 → taunt50 → ランダム）
    const ht=hateTarget();
    let tgt;
    if(ht&&ht.hp>0) tgt=ht;
    else{
      const taunters=lv.filter(a=>a.taunt50&&a.hp>0);
      tgt=(taunters.length>0&&Math.random()<.5)?randFrom(taunters):randFrom(lv.filter(a=>a.hp>0));
    }
    if(!tgt) continue;

    // 攻撃アニメーション：青＝攻撃元、赤＝攻撃対象
    const _eSlotEl=document.getElementById('f-enemy')?.querySelectorAll('.slot')[G.enemies.indexOf(e)];
    const _aSlotEl=document.getElementById('f-ally')?.querySelectorAll('.slot')[G.allies.indexOf(tgt)];
    if(_eSlotEl) _eSlotEl.classList.add('glow-blue');
    if(_aSlotEl) _aSlotEl.classList.add('glow-red');
    await sleep(400);
    if(_eSlotEl) _eSlotEl.classList.remove('glow-blue');
    if(_aSlotEl) _aSlotEl.classList.remove('glow-red');

    const tgtHpBefore=tgt.hp;
    const dmgToAlly=atkVal;
    tgt.hp=Math.max(0,tgt.hp-dmgToAlly);
    if(dmgToAlly>0){
      onDamageCount();
      // 敵キーワード：敵が仲間にダメージを与えた時に発動
      applyKeywordOnHit(e,tgt);
    }

    // 範囲攻撃（隣接仲間にもダメージ。キーワード効果も適用。反撃は対象のみ）
    const rangeHit=[];
    if(dmgToAlly>0&&e.keywords&&e.keywords.includes('範囲攻撃')){
      const tgtIdx=G.allies.indexOf(tgt);
      [-1,1].forEach(d=>{
        const adj=G.allies[tgtIdx+d];
        if(adj&&adj.hp>0){
          adj.hp=Math.max(0,adj.hp-dmgToAlly);
          log(`💥 範囲攻撃：${adj.name}にも${dmgToAlly}ダメ`,'bad');
          applyKeywordOnHit(e,adj);
          rangeHit.push(adj);
        }
      });
    }

    // 守護
    let counterUnit=tgt;
    if(tgt.guardian&&tgt.hp>0){
      const nonG=G.allies.filter(a=>a.hp>0&&!a.guardian&&a.id!==tgt.id);
      if(nonG.length>0){ counterUnit=randFrom(nonG); log(`🛡 守護発動：${tgt.name}の代わりに${counterUnit.name}が反撃！`,'good'); }
    }

    const dmgToEnemy=counterUnit.atk;
    const eHpBefore=e.hp;
    dealDmgToEnemy(e,dmgToEnemy,G.enemies.indexOf(e),counterUnit);
    const actualDmg=eHpBefore-e.hp; // シールドで防がれた場合は0

    log(`${e.name}(${atkVal})→${tgt.name}[${tgtHpBefore}→${tgt.hp}] 反撃:${counterUnit.name}(${dmgToEnemy})→${e.name}[${e.hp}]`);

    // 仲間キーワード：反撃でダメージを与えた時に発動（シールドで防がれた場合は無効）
    if(actualDmg>0) applyKeywordOnHit(counterUnit,e);

    // 特殊ユニット効果
    if(tgt.unique==='dragon_counter'&&dmgToAlly>0&&tgt.hp>0){
      const dtargets=G.enemies.filter(e=>e.hp>0);
      if(dtargets.length>0){
        const dt=randFrom(dtargets);
        dealDmgToEnemy(dt,counterUnit.atk,G.enemies.indexOf(dt));
        log(`🐉 竜の反撃：${dt.name}に${counterUnit.atk}ダメ`,'bad');
      }
    }
    if(tgt.unique==='bear_grow'&&dmgToAlly>0&&tgt.hp>0){
      const brRing=G.rings.find(r=>r&&r.id===tgt.ringId);
      const bm=GRADE_MULT[brRing?.grade||1];
      const bg=2*bm;
      tgt.atk+=bg; tgt.hp+=bg; tgt.maxHp+=bg;
      log(`🐻 熊が強化：ATK+${bg}/HP+${bg}→${tgt.atk}/${tgt.hp}`,'good');
    }

    // 仲間死亡処理（tgt・counterUnit・範囲攻撃で倒れたユニットをすべてチェック）
    const baseCheck=counterUnit.id!==tgt.id?[tgt,counterUnit]:[tgt];
    const toCheck=[...new Set([...baseCheck,...rangeHit])];
    for(const unit of toCheck){
      if(unit.hp>0) continue;
      if(unit.resurrection&&!unit.resurrected){
        unit.hp=unit.maxHp; unit.resurrected=true;
        log(`✨ ${unit.name}が再生で復活！`,'good');
        continue;
      }
      unit.hp=0;
      onAllyDeath(unit);
      if(unit.keywords&&unit.keywords.includes('リーダー')) removeAllyLeaderBonus(unit);
      if(unit.regen&&!unit.regenUsed){
        unit.hp=unit.maxHp; unit.regenUsed=true;
        log(`✨ 再生：${unit.name}が完全復活！`,'good');
      } else {
        G.lastDead=clone(unit);
        log(`${unit.name} が倒れた…`,'bad');
        if(unit.onDeath==='stone_death'){
          const stMult=GRADE_MULT[G.rings.find(r=>r&&r.id===unit.ringId)?.grade||1];
          const stB=Math.round(10*stMult);
          let stN=0;
          G.allies.forEach(a=>{ if(a.id!==unit.id&&a.hp>0){ a.atk+=stB; a.hp+=stB; a.maxHp+=stB; stN++; }});
          log(`🗿 石像効果：${stN}体にATK+${stB}/HP+${stB}`,'good');
        }
        if(unit.onDeath==='shadow_death'){
          const shRing=G.rings.find(r=>r&&r.id===unit.ringId);
          const shMult=GRADE_MULT[shRing?.grade||1];
          const shDmg=Math.max(1,shMult);
          G.enemies.forEach((en,ei)=>{ if(en.hp>0) dealDmgToEnemy(en,shDmg,ei,unit); });
          G.allies.forEach(a=>{ if(a.id!==unit.id&&a.hp>0){ a.hp=Math.max(0,a.hp-shDmg); }});
          log(`👻 影の爆発：全キャラに${shDmg}ダメ`,'bad');
        }
        const hasRage=G.rings.some(r=>r&&r.enchants?.includes('憤怒'));
        if(hasRage){ G.allies.forEach(a=>{if(a.hp>0)a.atk=Math.round(a.atk*1.2);}); log('憤怒：残存仲間ATK+20%','good'); }
      }
    }

    if(G.allies.filter(a=>a.hp>0).length===0&&e.hp>0){
      const directDmg2=e.grade||1;
      G.life=Math.max(0,G.life-directDmg2);
      log(`${e.name} がプレイヤーを直接攻撃！ライフ-${directDmg2}`,'bad');
      updateHUD();
      if(G.life<=0){ renderAll(); await sleep(200); gameOver(); return; }
    }
    await sleep(400); // 各敵の攻撃間 400ms
  }

  // ヘイトターン数消費・パワーブレイク解除（仲間・敵共通）
  G.allies.forEach(a=>{
    if(a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; }
    if(a.powerBroken){ a.atk=a._savedAtk||a.baseAtk; a.powerBroken=false; delete a._savedAtk; }
  });
  G.enemies.forEach(e=>{
    if(e.powerBroken){ e.atk=e._savedAtk||e.baseAtk; e.powerBroken=false; delete e._savedAtk; }
  });
  updateHUD(); renderAll();
  await sleep(600); // 敵ターン終了後 600ms

  // 勝利チェック
  if(G.enemies.filter(e=>e.hp>0).length===0){
    log('全敵撃破！','gold');
    G.moveMasks.forEach((_,i)=>{ if(G.moveMasks[i]&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i); });
    applyVictoryBonuses();
    updateHUD(); renderAll();
    G.phase='reward';
    setTimeout(()=>_handleVictory(),600);
    return;
  }

  // ターン上限（5ターン）→ 耐久成功
  if(G.turn>=5){
    log('耐久成功！','gold');
    applyVictoryBonuses();
    updateHUD(); renderAll();
    G.phase='reward';
    setTimeout(()=>_handleVictory(),600);
    return;
  }

  // 次ターンへ
  await nextTurn();
}

// ── 撤退 ──────────────────────────────────────

function retreat(){
  if(G.phase!=='player') return;
  if(!G.visibleMoves.some(i=>G.moveMasks[i])) return;
  log('撤退を選択','sys');
  G.phase='reward';
  goToReward();
}
