// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, summon.js, pool.js
// ═══════════════════════════════════════

// ── ボスフラグ（startBattleで設定・必ず参照より先に宣言）──
let _isBossFight = false;

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

// ── 戦闘開始 ──────────────────────────────────

async function startBattle(){
  clearLog();

  // isBossFightを最初に確定（参照より先に必ず宣言）
  const fd=FLOOR_DATA[G.floor];
  _isBossFight=!!(fd&&fd.boss);

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
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

  // 非ボス戦：戦闘開始時にランダムな仲間1体にヘイトを付与
  if(!_isBossFight){
    const _liveA=G.allies.filter(a=>a.hp>0);
    if(_liveA.length>0){
      const _ht=randFrom(_liveA);
      _ht.hate=true; _ht.hateTurns=99;
      log(`👹 敵司令官：${_ht.name}にヘイトを付与`,'bad');
    }
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
      G.earnedGold++; G.gold++;
      if(G.moveMasks[idx]&&!G.visibleMoves.includes(idx)) G.visibleMoves.push(idx);
    }
  });
  log(`全移動マスが開放された`,'gold');
  applyVictoryBonuses();
  updateHUD(); renderAll();
  G.phase='reward';
  setTimeout(()=>goToReward(),600);
  return true;
}

// ── 敵司令官フェイズ ──────────────────────────

async function commanderPhase(){
  G.phase='commander';
  renderControls();
  log('👹 敵司令官フェイズ','bad');

  const liveE=G.enemies.filter(e=>e.hp>0);
  if(!liveE.length){ await sleep(300); return; }

  const bonus=Math.max(1,Math.floor(G.floor/5));
  const actions=['強化','鼓舞','シールド','ヘイト'];
  if(liveE.length<6) actions.push('召喚');
  const action=randFrom(actions);

  switch(action){
    case '強化':
      liveE.forEach(e=>{ e.atk+=bonus; });
      log(`👹 強化：全敵ATK+${bonus}`,'bad');
      break;
    case 'ヘイト':{
      const liveA=G.allies.filter(a=>a.hp>0);
      if(liveA.length>0){
        G.allies.forEach(a=>a.hate=false);
        const t=randFrom(liveA);
        t.hate=true; t.hateTurns=99;
        log(`👹 ヘイト：${t.name}にヘイトを付与`,'bad');
      }
      break;
    }
    case '召喚':{
      const avgAtk=Math.max(1,Math.round(liveE.reduce((s,e)=>s+e.atk,0)/liveE.length));
      const avgHp =Math.max(1,Math.round(liveE.reduce((s,e)=>s+e.hp, 0)/liveE.length));
      const ni=randi(0,ENEMY_NAMES.length-1);
      const ne={
        id:uid(),name:ENEMY_NAMES[ni],icon:ENEMY_ICONS[ni],
        atk:avgAtk,hp:avgHp,maxHp:avgHp,baseAtk:avgAtk,
        grade:FLOOR_DATA[G.floor].grade,
        sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
        shield:0,keywords:[],powerBreak:false
      };
      const emptyIdx=G.enemies.findIndex(e=>e.hp<=0);
      if(emptyIdx>=0) G.enemies[emptyIdx]=ne;
      else if(G.enemies.filter(e=>e.hp>0).length<6) G.enemies.push(ne);
      log(`👹 召喚：${ne.name}(${avgAtk}/${avgHp})が現れた！`,'bad');
      break;
    }
    case '鼓舞':{
      const t=randFrom(liveE);
      const hp=G.floor*2;
      t.hp+=hp; t.maxHp+=hp;
      log(`👹 鼓舞：${t.name}のHP+${hp}`,'bad');
      break;
    }
    case 'シールド':{
      const t=randFrom(liveE);
      t.shield=(t.shield||0)+1;
      log(`👹 シールド：${t.name}にシールド+1`,'bad');
      break;
    }
  }

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
    const mult=GRADE_MULT[ring.grade||1];
    if(ring.unique==='needle'){
      const shots=2*mult;
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
        G.buffAdjBonuses[adj.id].atk++;
        G.buffAdjBonuses[adj.id].hp++;
        log(`増幅：${adj.name}に+1/+1蓄積（累計+${G.buffAdjBonuses[adj.id].atk}）`,'sys');
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
    setTimeout(()=>goToReward(),400);
    return true;
  }
  return false;
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
    if(srcUnit) applyPoisonOnDmg(e,srcUnit);
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
  G.earnedGold+=1; G.gold+=1;
  log(`${e.name} 撃破！金+1`,'gold');
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
      G.life=Math.max(0,G.life-1);
      log(`${e.name} がプレイヤーを直接攻撃！ライフ-1`,'bad');
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
    if(dmgToAlly>0) onDamageCount();

    // 範囲攻撃（隣接仲間にもダメージ。反撃は対象のみ）
    if(dmgToAlly>0&&e.keywords&&e.keywords.includes('範囲攻撃')){
      const tgtIdx=G.allies.indexOf(tgt);
      [-1,1].forEach(d=>{
        const adj=G.allies[tgtIdx+d];
        if(adj&&adj.hp>0){ adj.hp=Math.max(0,adj.hp-dmgToAlly); log(`💥 範囲攻撃：${adj.name}にも${dmgToAlly}ダメ`,'bad'); }
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

    // 敵キーワード：この敵にダメージを与えた仲間（counterUnit）に効果適用
    // ※シールドで防がれた場合（actualDmg=0）は発動しない
    if(actualDmg>0&&e.keywords){
      if(e.keywords.includes('即死')){
        counterUnit.hp=0;
        log(`💀 即死：${counterUnit.name}が即死！`,'bad');
      }
      if(e.keywords.includes('毒')){
        counterUnit.poison=(counterUnit.poison||0)+3;
        log(`☠ ${e.name}の毒：${counterUnit.name}に毒付与（HP-3/T）`,'bad');
      }
      if(e.keywords.includes('パワーブレイク')&&!counterUnit.powerBroken){
        counterUnit.powerBroken=true; counterUnit._savedAtk=counterUnit.atk; counterUnit.atk=0;
        log(`💢 パワーブレイク：${counterUnit.name}のATK→0（次ターンまで）`,'bad');
      }
    }

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

    // 仲間死亡処理（tgt と counterUnit が異なる場合は両方チェック）
    const toCheck=counterUnit.id!==tgt.id?[tgt,counterUnit]:[tgt];
    for(const unit of toCheck){
      if(unit.hp>0) continue;
      if(unit.resurrection&&!unit.resurrected){
        unit.hp=unit.maxHp; unit.resurrected=true;
        log(`✨ ${unit.name}が再生で復活！`,'good');
        continue;
      }
      unit.hp=0;
      onAllyDeath(unit);
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
      G.life=Math.max(0,G.life-1);
      log(`${e.name} がプレイヤーを直接攻撃！ライフ-1`,'bad');
      updateHUD();
      if(G.life<=0){ renderAll(); await sleep(200); gameOver(); return; }
    }
    await sleep(400); // 各敵の攻撃間 400ms
  }

  // ヘイトターン数消費・パワーブレイク解除
  G.allies.forEach(a=>{
    if(a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; }
    if(a.powerBroken){ a.atk=a._savedAtk||a.baseAtk; a.powerBroken=false; delete a._savedAtk; }
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
    setTimeout(()=>goToReward(),600);
    return;
  }

  // ターン上限（5ターン）→ 耐久成功
  if(G.turn>=5){
    log('耐久成功！報酬画面へ','gold');
    applyVictoryBonuses();
    updateHUD(); renderAll();
    G.phase='reward';
    setTimeout(()=>goToReward(),600);
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
