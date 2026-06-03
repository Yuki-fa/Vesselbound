// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// ── キーワードツールチップ（KW_DESC_MAP は loader.js で effect_id シートから読み込み）──

(function _initKwTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  let _dragging=false;
  document.addEventListener('dragstart',()=>{ _dragging=true; tip.style.display='none'; }, true);
  document.addEventListener('dragend',()=>{ _dragging=false; }, true);
  document.addEventListener('mouseup',()=>{ _dragging=false; }, true);
  document.addEventListener('mousemove',e=>{
    if(_dragging){ tip.style.display='none'; return; }
    const tgt=e.target&&e.target.closest?e.target:null;
    const el=tgt&&(tgt.closest('.slot-badge[data-kwdesc]')||tgt.closest('[data-preview]'));
    if(!el){ tip.style.display='none'; return; }
    const desc=el.getAttribute('data-kwdesc')||el.getAttribute('data-preview')||'';
    if(!desc){ tip.style.display='none'; return; }
    tip.textContent=desc;
    tip.style.display='block';
    _posKwTip(tip,e);
  });
})();
function _posKwTip(tip,e){
  const x=e.clientX+12, y=e.clientY-8;
  const tw=tip.offsetWidth, th=tip.offsetHeight;
  tip.style.left=Math.min(x,window.innerWidth-tw-8)+'px';
  tip.style.top=Math.max(4,(y-th>4?y-th:y+16))+'px';
}

// 指輪の実効ステータスを計算（グレード倍率・エンチャント・バフ込み）
function effectiveStats(ring){
  if(!ring||!ring.summon) return null;
  const grade=ring.grade||1;
  const mult=GRADE_MULT[grade];
  let atk=ring.atkPerGrade!==undefined?ring.summon.atk+ring.atkPerGrade*(GRADE_COEFF[grade]||grade):Math.round(ring.summon.atk*mult);
  let hp =ring.hpPerGrade !==undefined?ring.summon.hp +ring.hpPerGrade *(GRADE_COEFF[grade]||grade):Math.round(ring.summon.hp *mult);
  const bab=G.buffAdjBonuses[ring.id];
  if(bab){ atk+=bab.atk||0; hp+=bab.hp||0; }
  const enc=ring.enchants||[];
  const em2=GRADE_MULT[ring.grade||1];
  atk+=5*em2*enc.filter(e=>e==='凶暴').length;
  hp +=5*em2*enc.filter(e=>e==='強壮').length;
  if(enc.includes('堅牢')) hp=Math.round(hp*1.3);
  const count=(ring.count||1)+enc.filter(e=>e==='増殖').length*(ring.grade||1);
  return {atk,hp,count};
}

// 味方・敵の全6スロット DOM 要素を配列で返す（lane 対応・ピッカー用）
function _getAllyDomSlots(){
  return [...(document.getElementById('f-ally')?.querySelectorAll('.slot')||[])];
}
function _getEnemyDomSlots(){
  return [...(document.getElementById('f-enemy')?.querySelectorAll('.slot')||[])];
}

// スロット高さをCSSカスタムプロパティに反映（リサイズ対応）
function _updateLaneOffset(){
  // 実在スロットが計測できれば最も正確
  const anyRow=document.getElementById('f-ally')||document.getElementById('f-enemy');
  const anySlot=anyRow&&anyRow.querySelector('.slot');
  if(anySlot){
    const h=anySlot.getBoundingClientRect().height;
    if(h>0){
      document.documentElement.style.setProperty('--_slot-h',h+'px');
      document.documentElement.style.setProperty('--lane-rear-top',Math.round(h*0.67)+'px');
      return;
    }
  }
  // フォールバック：max-width:1100px を考慮した計算
  const W=Math.min(document.documentElement.clientWidth,1100);
  const slotH=(W-49)/6*88/63;
  document.documentElement.style.setProperty('--_slot-h',Math.round(slotH)+'px');
  document.documentElement.style.setProperty('--lane-rear-top',Math.round(slotH*0.67)+'px');
}

// ── 攻撃ライン描画 ──
(function _initAttackLineSvg(){
  if(document.getElementById('atk-line-svg')) return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id='atk-line-svg';
  svg.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(svg);
})();

function showAttackLine(fromEl, toEls, color){
  const svg=document.getElementById('atk-line-svg');
  if(!svg||!fromEl||!toEls||!toEls.length) return;
  svg.innerHTML='';
  const fr=fromEl.getBoundingClientRect();
  const fx=fr.left+fr.width/2, fy=fr.top+fr.height/2;
  toEls.forEach(toEl=>{
    if(!toEl) return;
    const tr=toEl.getBoundingClientRect();
    const tx=tr.left+tr.width/2, ty=tr.top+tr.height/2;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',fx); line.setAttribute('y1',fy);
    line.setAttribute('x2',tx); line.setAttribute('y2',ty);
    line.setAttribute('stroke',color||'#fff');
    line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-opacity','0.85');
    line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);
  });
}

function hideAttackLine(){
  const svg=document.getElementById('atk-line-svg');
  if(svg) svg.innerHTML='';
}

function renderAll(){
  const _drResult=_emptyDR;
  renderField('f-ally',  G.allies,  false, _drResult.allyRisk,  undefined, _drResult.allyWarn, _drResult.allyDeathProb);
  renderField('f-enemy', G.enemies, true,  _drResult.enemyRisk, undefined, _drResult.enemyWarn, _drResult.enemyDeathProb);
  renderHand();
  renderControls();
  renderArcanaBar();
  renderEnemyHand();
  updateHUD();
  requestAnimationFrame(fitCardDescs);
}

// 戦闘フェイズ1ターン分をモンテカルロシミュレーション（N回）し死亡確率を集計する
// 確実死（全N回）→ allyRisk/enemyRisk、可能性あり（1〜N-1回）→ allyWarn/enemyWarn
const _emptyDR={allyRisk:new Set(),enemyRisk:new Set(),allyWarn:new Map(),enemyWarn:new Map(),allyDeathProb:new Map(),enemyDeathProb:new Map()};
function _computeDeathRisk(){
  if(G.phase!=='player') return _emptyDR;
  if(!G.allies.some(a=>a&&a.hp>0)||!G.enemies.some(e=>e&&e.hp>0)) return _emptyDR;

  // ── 状態を退避 ──
  const _sA=G.allies, _sE=G.enemies;
  const _sGold=G.gold, _sEarned=G.earnedGold;
  const _sBC=G.battleCounters, _sPT=G._pendingTreasure, _sEK=G._eliteKilled;
  const _sVM=G.visibleMoves, _sMM=G.moveMasks;
  const _sPhase=G.phase, _sSkelRevive=G._pendingSkelRevive;
  const _sUndeadBonus=G._undeadHpBonus, _sEnemyUndeadAtk=G.enemyUndeadAtkBonus;
  const _sEnemyPermBonus=G.enemyPermanentBonus?{...G.enemyPermanentBonus}:null;
  const _sMagicLevel=G.magicLevel;
  const _sLesserDemonDiscount=G._lesserDemonDiscount;
  const _sJackBonus=G._jackBonus, _sSpecterBonus=G._specterBonus, _sFutureCharAtkBonus=G._futureCharAtkBonus;
  const _sPendingFecht=G._pendingFechtRevives?JSON.parse(JSON.stringify(G._pendingFechtRevives)):[];
  const _sRaceBuffs=G.raceBuffs?JSON.parse(JSON.stringify(G.raceBuffs)):null;

  // ログ・描画関数を無効化
  const _L=window.log,_R=window.renderAll,_U=window.updateHUD,_RC=window.renderControls;
  window.log=()=>{}; window.renderAll=()=>{}; window.updateHUD=()=>{}; window.renderControls=()=>{};

  const N=100; // シミュレーション回数（100回で1%刻みの精度）
  const allyDeathCount  =new Array(6).fill(0);
  const enemyDeathCount =new Array(6).fill(0);
  const origAliveIds=_sA.map(a=>a&&a.hp>0?a.id:null);
  const origEnemyIds=_sE.map(e=>e&&e.hp>0?e.id:null);

  G._isSimulating=true;
  try{
    for(let trial=0;trial<N;trial++){
      // ── 毎回クローンを差し込んでシミュレーション ──
      G.allies  =_sA.map(a=>a?JSON.parse(JSON.stringify(a)):null);
      G.enemies =_sE.map(e=>e?JSON.parse(JSON.stringify(e)):null);
      G.battleCounters={damage:0,deaths:0};
      G.visibleMoves=[...(_sVM||[])];
      G.moveMasks=[...(_sMM||[])];
      G._pendingTreasure=_sPT;
      G._jackBonus=_sJackBonus;
      G._specterBonus=_sSpecterBonus;
      G._futureCharAtkBonus=_sFutureCharAtkBonus;
      G._pendingFechtRevives=_sPendingFecht?JSON.parse(JSON.stringify(_sPendingFecht)):[];
      G.raceBuffs=_sRaceBuffs?JSON.parse(JSON.stringify(_sRaceBuffs)):{};
      G._lesserDemonDiscount=_sLesserDemonDiscount;

      // 1ターン分シミュレーション（battlePhaseと同じスロット順：スロットiの敵→味方）
      for(let i=0;i<6;i++){
        const e=G.enemies[i];
        if(e&&e.hp>0) _drSimEnemySlot(e,i);
        if(!G.allies.some(a=>a&&a.hp>0&&!a._isSoul)||!G.enemies.some(e=>e&&e.hp>0&&!e._isObject)) break;
        const a=G.allies[i];
        if(a&&a.hp>0&&!a._isSoul) _drSimAllySlot(a,i);
        if(!G.allies.some(a=>a&&a.hp>0&&!a._isSoul)||!G.enemies.some(e=>e&&e.hp>0&&!e._isObject)) break;
      }
      // 標的ターン消費（1ラウンド分）
      G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });

      // 死亡予測は「ターン終了後の戦闘フェイズ」で空になるかだけを見る。
      // 次ターン開始時の毒・変身は、戦闘予測表示には含めない。

      // 死亡カウントを加算
      G.allies.forEach((a,i)=>{
        if(!origAliveIds[i]) return;
        if(!a||a.hp<=0||a.id!==origAliveIds[i]) allyDeathCount[i]++;
      });
      G.enemies.forEach((e,i)=>{
        if(!origEnemyIds[i]) return;
        if(!e||e.hp<=0||e.id!==origEnemyIds[i]) enemyDeathCount[i]++;
      });
    }

    // ── 集計：確実死 / 警告3段階（high/mid/low）──
    // 80%+→赤(will-die)、60-79%→高(will-warn-high)、40-59%→中(will-warn-mid)、21-39%→低(will-warn-low)
    const _riskThreshold=Math.ceil(N*0.80); // 16/20
    const _warnHigh    =Math.ceil(N*0.60); // 12/20
    const _warnMid     =Math.ceil(N*0.40); //  8/20
    const _warnThreshold=Math.ceil(N*0.21); //  5/20
    const _warnLevel=count=>count>=_warnHigh?'high':count>=_warnMid?'mid':'low';
    const allyRisk=new Set(), allyWarn=new Map(), allyDeathProb=new Map();
    allyDeathCount.forEach((count,i)=>{
      if(!origAliveIds[i]) return;
      if(count>0) allyDeathProb.set(i, Math.round(count/N*100));
      if(count>=_riskThreshold) allyRisk.add(i);
      else if(count>=_warnThreshold) allyWarn.set(i,_warnLevel(count));
    });
    const enemyRisk=new Set(), enemyWarn=new Map(), enemyDeathProb=new Map();
    enemyDeathCount.forEach((count,i)=>{
      if(!origEnemyIds[i]) return;
      if(count>0) enemyDeathProb.set(i, Math.round(count/N*100));
      if(count>=_riskThreshold) enemyRisk.add(i);
      else if(count>=_warnThreshold) enemyWarn.set(i,_warnLevel(count));
    });
    return {allyRisk, enemyRisk, allyWarn, enemyWarn, allyDeathProb, enemyDeathProb};

  } catch(e){
    console.error('[DR] シミュレーションエラー:', e);
    return _emptyDR;
  } finally {
    G._isSimulating=false;
    // ── 状態を完全復元 ──
    G.allies=_sA; G.enemies=_sE;
    G.gold=_sGold; G.earnedGold=_sEarned;
    G.battleCounters=_sBC; G._pendingTreasure=_sPT; G._eliteKilled=_sEK;
    G.visibleMoves=_sVM; G.moveMasks=_sMM;
    G.phase=_sPhase; G._pendingSkelRevive=_sSkelRevive;
    G._undeadHpBonus=_sUndeadBonus; G.enemyUndeadAtkBonus=_sEnemyUndeadAtk;
    if(_sEnemyPermBonus) G.enemyPermanentBonus=_sEnemyPermBonus;
    G.magicLevel=_sMagicLevel;
    G._lesserDemonDiscount=_sLesserDemonDiscount;
    G._jackBonus=_sJackBonus; G._specterBonus=_sSpecterBonus; G._futureCharAtkBonus=_sFutureCharAtkBonus;
    G._pendingFechtRevives=_sPendingFecht?JSON.parse(JSON.stringify(_sPendingFecht)):[];
    G.raceBuffs=_sRaceBuffs?JSON.parse(JSON.stringify(_sRaceBuffs)):{};
    window.log=_L; window.renderAll=_R; window.updateHUD=_U; window.renderControls=_RC;
  }
}

// シミュレーション用：allyAttackActionの同期コア（アニメーション・sleep除去）
function _drSimAllySlot(ally,allyIdx){
  if(ally.atk<=0) return;
  const liveE=G.enemies.filter(e=>e&&e.hp>0);
  if(!liveE.length) return;
  const target=getAttackTarget(ally,G.enemies);
  if(!target) return;
  const eIdx=G.enemies.indexOf(target);
  const isGlobal=ally.keywords&&ally.keywords.includes('全体攻撃');
  const isTriDir=ally.keywords&&ally.keywords.includes('三方向攻撃');
  if(ally.stealth) ally.stealth=false;
  if(ally.hp>0) _applyAllyAttackEffectsWithElf(ally);
  const atkTargets=isGlobal?[...liveE]:isTriDir?([eIdx-1,eIdx,eIdx+1].filter(i=>i>=0&&i<G.enemies.length).map(i=>G.enemies[i]).filter(e=>e&&e.hp>0)):[target];
  atkTargets.forEach(t=>{
    dealDmgToEnemy(t,ally.atk,G.enemies.indexOf(t),ally);
    // 反撃キーワード：さらに追加ダメージ（生き残った場合のみ）
    if(t.hp>0&&t.keywords&&t.keywords.includes('反撃')&&ally.hp>0){
      _applyEnemyAttackEffects(t);
      dealDmgToAlly(ally,t.atk,allyIdx,t);
    }
  });
  if(ally.hp>0&&!isGlobal&&!isTriDir){
    const extra=ally.keywords&&ally.keywords.includes('三段攻撃')?2:ally.keywords&&ally.keywords.includes('二段攻撃')?1:0;
    let cur=target;
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ cur=getAttackTarget(ally,G.enemies); if(!cur) break; }
      if(ally.hp>0) _applyAllyAttackEffectsWithElf(ally);
      dealDmgToEnemy(cur,ally.atk,G.enemies.indexOf(cur),ally);
    }
  }
}

// シミュレーション用：enemyAttackActionの同期コア（アニメーション・sleep除去）
function _drSimEnemySlot(enemy,_enemyIdx){
  if(enemy.atk<=0) return;
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;
  if(enemy.sealed>0){
    enemy.sealed--;
    return;
  }
  const primaryTarget=getAttackTarget(enemy,G.allies);
  if(!primaryTarget) return;
  const targets=[primaryTarget];
  const primaryIdx=G.allies.indexOf(primaryTarget);
  const atkVal=enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;
  // 攻撃時効果
  if(atkVal>0&&enemy.hp>0) _applyEnemyAttackEffectsWithElf(enemy);
  const isGlobal=enemy.keywords&&enemy.keywords.includes('全体攻撃');
  const isTriDir=enemy.keywords&&enemy.keywords.includes('三方向攻撃');
  const finalT=isGlobal?G.allies.filter(a=>a&&a.hp>0&&!a.stealth):isTriDir?([primaryIdx-1,primaryIdx,primaryIdx+1].filter(i=>i>=0&&i<G.allies.length&&G.allies[i]&&G.allies[i].hp>0&&!G.allies[i].stealth).map(i=>G.allies[i])):targets;
  const hitSet=new Set();
  finalT.forEach(tgt=>{
    if(hitSet.has(tgt.id)) return;
    dealDmgToAlly(tgt,atkVal,G.allies.indexOf(tgt),enemy);
    hitSet.add(tgt.id);
  });
  if(!isGlobal&&!isTriDir&&enemy.hp>0){
    const extra=enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0;
    let cur=finalT[0];
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ cur=getAttackTarget(enemy,G.allies); if(!cur) break; }
      if(!cur||cur.hp<=0) break;
      if(enemy.hp>0) _applyEnemyAttackEffectsWithElf(enemy);
      dealDmgToAlly(cur,enemy.atk,G.allies.indexOf(cur),enemy);
    }
  }
  // 標的ターン消費はシミュレーション1ラウンド分をbattlePhaseと同様に外で処理
}

// キーワードバッジで表示済みの文字列をdesc先頭から除去
function _stripKeywordsFromDesc(desc, unit){
  if(!desc) return desc;
  const patterns=[
    ...(unit.keywords||[]),
    ...(unit.counter?['反撃']:[]),
    '2回攻撃','トリプル','3段攻撃','2段攻撃',
  ];
  let result=desc;
  let changed=true;
  while(changed){
    changed=false;
    for(const kw of patterns){
      // 数字部分が黄金の雫で<span>化されていても一致するよう柔軟にマッチ
      const esc=kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
                  .replace(/\d+/g,'(?:\\d+|<span[^>]*>\\d+<\\/span>)');
      const re=new RegExp('^'+esc+'[\\s\u3000。、]*');
      const next=result.replace(re,'').trimStart();
      if(next!==result){ result=next; changed=true; break; }
    }
  }
  return result.trim();
}

function _unitPreviewText(unit, desc){
  if(!unit) return desc||'';
  const lines=[];
  if(unit.name) lines.push(unit.name);
  if(unit.race&&unit.race!=='-') lines.push(`種族：${unit.race}`);
  lines.push(`最大ライフ：${unit.maxHp||unit.hp||0}`);
  const kws=[...new Set([...(unit.keywords||[]),...(unit.counter?['反撃']:[])])].filter(Boolean);
  if(kws.length) lines.push(`キーワード：${kws.join(' / ')}`);
  if(desc) lines.push(desc);
  return lines.join('\n');
}

let _allyDragSrc=-1;
let _allyLastDropAt=0;

function renderField(id,units,isEnemy,_extDeathRisk,_lane,_extWarnRisk,_extDeathProb){
  const el=document.getElementById(id);
  el.innerHTML='';
  const deathRisk=_extDeathRisk!=null?_extDeathRisk:new Set();
  const warnRisk=_extWarnRisk!=null?_extWarnRisk:new Map();
  const deathProb=_extDeathProb!=null?_extDeathProb:new Map();
  const _worldMapPanel=document.getElementById('world-map-panel');
  const _worldMapVisible=!!(_worldMapPanel&&typeof getComputedStyle==='function'&&getComputedStyle(_worldMapPanel).display!=='none'&&_worldMapPanel.offsetWidth>0&&_worldMapPanel.offsetHeight>0);
  const _nonCombatAuraPhase=G.phase!=='enemy'&&(G.phase!=='player'||_worldMapVisible||G._isShop||G._isRewardTown);
  // 優先ターゲットのインデックスを特定（グループ全体をハイライト）
  // _isObject のユニットは攻撃対象外なので除外
  const liveUnits=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&!x.u._isObject);
  const prioritySet=new Set();
  if(isEnemy){
    // allyTarget 強制指定 → 前衛（lane==='front' or hate）→ 全生存敵
    const forced=liveUnits.filter(x=>x.u.allyTarget);
    if(forced.length){
      forced.forEach(x=>prioritySet.add(x.i));
    } else {
      const front=liveUnits.filter(x=>(x.u.lane==='front'||(x.u.hate&&x.u.hateTurns>0))&&!x.u.stealth);
      (front.length?front:liveUnits).forEach(x=>prioritySet.add(x.i));
    }
  } else {
    // hate（前衛・タウント）→ 全生存味方（getAttackTargetと同じロジック）
    const hated=liveUnits.filter(x=>x.u.hate&&x.u.hateTurns>0&&!x.u.stealth);
    (hated.length?hated:liveUnits.filter(x=>!x.u.stealth)).forEach(x=>prioritySet.add(x.i));
  }
  for(let i=0;i<6;i++){
    const u=units[i];
    if(u&&u._occupiedEnemy){
      slot.style.visibility='hidden';
      continue;
    }
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    const canReorderAllies=!isEnemy&&(G.phase==='player'||G.phase==='map');
    if(canReorderAllies){
      slot.addEventListener('dragover',e=>{
        if(_allyDragSrc>=0){
          e.preventDefault();
          e.dataTransfer.dropEffect='move';
        }
      });
      slot.addEventListener('drop',e=>{
        if(_allyDragSrc<0||_allyDragSrc===i) return;
        e.preventDefault();
        const from=_allyDragSrc;
        [G.allies[from],G.allies[i]]=[G.allies[i],G.allies[from]];
        _allyDragSrc=-1;
        _allyLastDropAt=Date.now();
        log('仲間の位置を入れ替えた','sys');
        updateHUD();
        if(G.phase==='map'&&typeof showWorldMap==='function') showWorldMap();
        else renderAll();
      });
    }
    // 敵スロットのレーン：生存敵はu.lane、死亡/空スロットはmoveMaskLanesで補完
    const _slotLane=isEnemy?(u&&u.hp>0?u.lane:(G.moveMaskLanes?.[i]||'front')):'';
    if(u&&u.hp>0&&((isEnemy&&_slotLane==='front')||(!isEnemy&&u.hate&&u.hateTurns>0))) slot.classList.add('is-defender');
    if(u&&u.hp>0){
      slot.classList.add('unit-card');
      if(isEnemy&&u._size>1){
        slot.style.width='calc(200% + 8px)';
        slot.style.zIndex='5';
      }
      if(!isEnemy&&i===G.selectedAllyIdx) slot.classList.add('selected-ally');
      if(!isEnemy&&_nonCombatAuraPhase) slot.classList.add('noncombat-aura');
      if(!isEnemy&&u._actedThisTurn) slot.classList.add('acted-ally');
      if(typeof applyUnitVisual==='function') applyUnitVisual(slot,u);
      if(isEnemy&&typeof getSheetRaceByName==='function'){
        const _sheetRace=getSheetRaceByName(u.name);
        if(_sheetRace) u.race=_sheetRace;
      }
      // ライブユニットは常にユニットとして描画する（moveMask は死亡スロットにのみ表示）
      {
        // ── ステータスバッジ（右上固定：状態異常のみ）──
        const bs=[];
        const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';};
        // 標的バッジは非表示（is-front の視覚的シフトで代用）
        if(u.guardian) bs.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
        if(u.sealed>0) bs.push(`<span class="slot-badge b-seal"${_sd('封印')}>封印</span>`);
        if(u.instadead) bs.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${u.poison}</span>`);
        if(u.doomed>0) bs.push(`<span class="slot-badge b-dead" data-kwdesc="破滅が10になると死亡する。">破滅${u.doomed}</span>`);
        if(u.regen) bs.push(`<span class="slot-badge b-regen"${_sd('再生')}>再生${u.regen}</span>`);
        if(u.stealth) bs.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
        if(u.allyTarget) bs.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        // ── キーワードブロック（パワー/ライフとテキストの中間・中央揃え）──
        // 反撃はキーワード欄に表示。エリート/ボスは他キーワードの1行上。
        const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','A・シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090','アーティファクト':'#b0a080'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
        const _allKws=[...new Set([...(u.keywords||[]),...(u.counter?['反撃']:[])])].filter(k=>k!=='反撃');
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:1px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
        const _auraTag=(!isEnemy&&_nonCombatAuraPhase)?'<div class="noncombat-aura-vfx"></div>':'';
        const gradeTag=u.grade?`<div class="slot-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(u.grade):gradeStr(u.grade)}</div>`:'';
        const _rawDesc=u.desc?computeDesc(u):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
        const _preview=_unitPreviewText(u,_desc);
        if(_preview) slot.setAttribute('data-preview',_preview);
        const _maxHp=Math.max(u.maxHp||u.hp||0,u.hp||0);
        const _hpClass=(u.hp||0)<_maxHp?'h damaged':'h';
        const _shownAtk=typeof getUnitDisplayAtk==='function'?getUnitDisplayAtk(u):u.atk;
        const raceTag=u.race&&u.race!=='-'?`<div class="slot-race">${u.race}</div>`:'';
        const _isObj=!!u._isObject;
        const _probPct=_isObj?null:deathProb.get(i);
        const _zone=_probPct==null?null:_probPct>=100?{cls:'will-die',label:'💀',color:'#ff6060'}:_probPct<=20?{cls:'will-warn-low',label:'死亡確率・小',color:'#f0d000'}:_probPct<=79?{cls:'will-warn-mid',label:'死亡確率・中',color:'#f09000'}:{cls:'will-warn-high',label:'死亡確率・大',color:'#e04800'};
        const _probTag=_zone!=null?`<div class="death-prob-label" style="position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:.52rem;font-weight:700;z-index:3;white-space:nowrap;pointer-events:none;color:${_zone.color}">${_zone.label}</div>`:'';
        const _riskTag=_zone!=null?'<div class="risk-particles"></div>':'';
        // 情報ブロック：絶対配置でカード全体に広げ中央固定
        // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
        const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
        const _btmStyle='position:absolute;bottom:6px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0;z-index:1;pointer-events:auto';
        slot.style.borderTop='2px solid var(--teal2)';
        if(isEnemy){
          slot.innerHTML=`${badgeBlock}${gradeTag}${_probTag}${_riskTag}<div class="unit-portrait"></div><div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${_shownAtk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        } else {
          const dragonetSub=u.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(u._dragonetBonus||0))-(u._dragonetCount||0)}戦</div>`:'';
          slot.innerHTML=`${_auraTag}${badgeBlock}${gradeTag}${_probTag}${_riskTag}<div class="unit-portrait"></div><div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${_shownAtk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div>`;
        }
        // オブジェクトは攻撃対象外なので赤枠・死亡予測は表示しない
        if(!_isObj){
          if(prioritySet.has(i)) slot.classList.add('priority-target');
          // ラベルと同じ閾値で枠色を決定（100%=will-die / 80-99%=high / 21-79%=mid / 1-20%=low）
          if(_zone) slot.classList.add(_zone.cls);
        }
      }
      if(u&&u.hp>0&&!isEnemy){
        if(canReorderAllies){
          slot.draggable=true;
          slot.addEventListener('dragstart',e=>{
            _allyDragSrc=i;
            e.dataTransfer.effectAllowed='move';
            slot.classList.add('dragging');
          });
          slot.addEventListener('dragend',()=>{
            _allyDragSrc=-1;
            slot.classList.remove('dragging');
          });
        }
        slot.onclick=()=>{
          if(G.phase==='enemy') return;
          if(Date.now()-_allyLastDropAt<120) return;
          if(G.phase==='player'&&G._manualTurnActive&&typeof isManualActiveUnit==='function'&&!isManualActiveUnit(u)){
            setHint('現在の行動キャラクターではありません。');
            return;
          }
          if(typeof selectAllyLoadout==='function') selectAllyLoadout(i);
          renderHand();
          renderField('f-ally',G.allies,false);
          setHint(G.phase==='player'
            ? (u._actedThisTurn?'この仲間は行動済みです。':'この仲間の行動を選択してください。')
            : '仲間を選択しました。');
        };
      }
    } else if(isEnemy&&G.visibleMoves.includes(i)&&G.moveMasks[i]&&(!u||u.hp<=0)&&(!_lane||_slotLane===_lane)){
      const _mvType=G.moveMasks[i];
      const nt=NODE_TYPES[_mvType];
      // 宝・移動マスはインベントリカード相当のサイズで上部に表示（前衛キャラの背後に隠れる）
      slot.classList.remove('is-rear');
      slot.classList.add('has-mini-card');
      const _isChestMask=String(_mvType).startsWith('chest');
      if(_isChestMask){
        const _ctp=_mvType==='chest_ring'?'ring':_mvType==='chest_wand'?'wand':_mvType==='chest_item'?'consumable':'wand';
        slot.innerHTML=`<div class="mini-card chest-mini ${_ctp}"><div class="mini-tp">${nt.label}</div><div class="mini-q">？</div><div class="mini-hint">+1消費</div></div>`;
        slot.title='クリックで取得（行動力-1）';
        slot.onclick=()=>{
          if(typeof onChestClick==='function') onChestClick(i);
        };
      } else {
        slot.innerHTML=`<div class="mini-card move-mini"><div class="mini-icon">${nt.icon}</div><div class="mini-lbl">${nt.label}</div></div>`;
        slot.title='クリックで撤退';
        slot.onclick=()=>{
          if(G.phase!=='player') return;
          showRetreatConfirm(_mvType);
        };
      }
    } else {
      slot.classList.add('empty');
    }
    el.appendChild(slot);
  }
}

function renderHand(){
  renderRingSlots();
  renderHandSlots();
}

let _selectedRingIdx=-1;

function _hasExplicitSelectedAlly(){
  return typeof G!=='undefined'
    && G.selectedAllyIdx!=null
    && G.selectedAllyIdx>=0
    && G.allies
    && G.allies[G.selectedAllyIdx]
    && G.allies[G.selectedAllyIdx].hp>0
    && !G.allies[G.selectedAllyIdx]._isSoul;
}

function clearAllyLoadoutSelection(){
  if(typeof G==='undefined'||G.selectedAllyIdx==null||G.selectedAllyIdx<0) return;
  G.selectedAllyIdx=-1;
  _selectedRingIdx=-1;
  renderHand();
  renderField('f-ally',G.allies,false);
}

function renderRingSlots(){
  const el=document.getElementById('ring-slots');
  if(!el) return;
  const extraRow=document.getElementById('ring-extra-row');
  if(extraRow) extraRow.style.display='none';
  el.innerHTML='';
  el.style.gridTemplateColumns='repeat(0,1fr)';
  const ringPane=document.getElementById('ring-pane');
  if(ringPane){ ringPane.style.flex=0; ringPane.style.display='none'; }
  const handPane=document.getElementById('hand-pane');
  if(handPane) handPane.style.flex=10;
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=0;
  const rm=document.getElementById('ring-max'); if(rm) rm.textContent=0;
}

function appendEquipSlotLabel(el,label){
  if(!el||!label) return;
  el.classList.add('equip-slot-frame');
  const slotLabel=document.createElement('div');
  slotLabel.className='equip-slot-label';
  slotLabel.textContent=label;
  el.appendChild(slotLabel);
}

// インベントリスロット（杖＋消耗品の混合 7 枠）
function renderHandSlots(){
  const el=document.getElementById('hand-slots');
  if(!el) return;
  const owner=_hasExplicitSelectedAlly()&&typeof syncSelectedUnitLoadout==='function'?syncSelectedUnitLoadout():null;
  el.innerHTML='';
  if(!owner){
    el.style.gridTemplateColumns='repeat(0,1fr)';
    el.style.setProperty('--unit-inventory-cols',0);
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=0;
    const hm=document.getElementById('hand-max'); if(hm) hm.textContent=0;
    return;
  }
  const H=G.handSlots||4;
  const R=G.ringSlots||0;
  const totalSlots=Math.max(1,H+R+1);
  const Hcols=Math.max(5,totalSlots);
  el.style.gridTemplateColumns=`repeat(${Hcols},1fr)`;
  el.style.setProperty('--unit-inventory-cols',Hcols);
  const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s&&!(typeof isOccupiedSlot==='function'&&isOccupiedSlot(s))).length;
  const hm=document.getElementById('hand-max');   if(hm) hm.textContent=totalSlots;

  for(let i=0;i<Hcols;i++){
    if(i>=totalSlots){
      // 未解放スロット：極めて薄い表示
      const ph=document.createElement('div');
      ph.className='card-empty spell'; ph.style.opacity='0.1';
      el.appendChild(ph);
      continue;
    }
    if(i===0&&owner){
      const punch=owner&&typeof makePunchCard==='function'?makePunchCard(owner):null;
      if(punch){
        const div=mkCardEl(punch,0,'spell-battle');
        const canUse=owner&&(G.phase==='battle_end'||(G.phase==='player'&&(!G._manualTurnActive||(typeof isManualActiveUnit==='function'&&isManualActiveUnit(owner)))&&!owner._actedThisTurn));
        if(canUse){ div.classList.remove('inert'); div.onclick=()=>useUnitInventoryCard(0); }
        else div.classList.add('inert');
        el.appendChild(div);
      } else {
        const ph=document.createElement('div');
        ph.className='card-empty spell';
        el.appendChild(ph);
      }
      continue;
    }
    if(i>H){
      const ringIdx=i-H-1;
      const ring=G.rings[ringIdx];
      if(ring){
        const div=mkCardEl(ring,ringIdx,'ring-battle');
        div.classList.add('inert');
        div.style.opacity='0.72';
        div.style.outline='2px solid rgba(110,190,255,.75)';
        el.appendChild(div);
      } else {
        const ph=document.createElement('div');
        ph.className='card-empty spell ring-slot-empty';
        ph.style.opacity='0.35';
        ph.style.borderColor='rgba(110,190,255,.9)';
        ph.style.background='rgba(60,130,190,.18)';
        el.appendChild(ph);
      }
      continue;
    }
    const invIdx=i-1;
    const sp=G.spells[invIdx];
    if(sp&&typeof isOccupiedSlot==='function'&&isOccupiedSlot(sp)){
      const ph=document.createElement('div');
      ph.className='card-empty spell occupied';
      ph.style.opacity='0.18';
      el.appendChild(ph);
      continue;
    }
    if(sp){
      const div=mkCardEl(sp,invIdx,'spell-battle');
      const isChargeCard=sp.type==='wand'||sp.type==='weapon';
      const hasCharge=sp.usesLeft===undefined||sp.usesLeft>0;
      const inReward=G.phase==='reward';
      const inMap=G.phase==='map';
      const isUsableEquip=sp.type==='wand'||sp.type==='weapon'||sp.type==='consumable'||sp.type==='item';
      const worldMapUseLocked=typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&(
        inReward||G._mapChoiceOpen||G._worldMapFreeRecruit||G._fromWorldMapShop||G._isShop
      );
      const canUseMap=inMap&&!worldMapUseLocked;
      const canUse=(G.phase==='battle_end'||G.phase==='player'||canUseMap)&&owner&&(G.phase==='battle_end'||(!G._manualTurnActive||(typeof isManualActiveUnit==='function'&&isManualActiveUnit(owner)))&&!owner._actedThisTurn)&&(isChargeCard?hasCharge:true)&&isUsableEquip;
      if(canUse){ div.classList.remove('inert'); div.onclick=()=>useUnitInventoryCard(i); }
      else       { div.classList.add('inert'); }
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      ph.style.opacity='0.35';
      el.appendChild(ph);
    }
  }
}

// グレード表示（G10=★）— reward.js でも参照
function gradeStr(g){
  const n=Math.min(Math.max(g||1,1),MAX_GRADE);
  return '★'.repeat(n);
}
function _circleCost(n){
  const chars=['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
  return (n>=0&&n<chars.length)?chars[n]:`(${n})`;
}
function cardGradeStr(card){ return gradeStr(card.grade||1); }

// ()内の数式を計算する（×÷対応）
function _evalMath(desc){
  return desc.replace(/\(([^)]+)\)/g,(match,inner)=>{
    const expr=inner.replace(/×/g,'*').replace(/÷/g,'/').trim();
    if(/^[\d\s+\-*/.]+$/.test(expr)){
      try{
        // eslint-disable-next-line no-new-func
        const r=Function('"use strict";return ('+expr+')')();
        if(typeof r==='number'&&isFinite(r))
          return Number.isInteger(r)?String(r):r.toFixed(1);
      }catch(e){}
    }
    return match;
  });
}

// カードのdesc要素をコンテナからはみ出さないようフォントサイズを縮小
function fitCardDescs(){
  function fit(el,container){
    el.style.fontSize='';
    let fs=parseFloat(window.getComputedStyle(el).fontSize);
    while(container.scrollHeight>container.clientHeight+1&&fs>6.5){
      fs=Math.max(6.5,fs-0.5);
      el.style.fontSize=fs+'px';
    }
  }
  document.querySelectorAll('.card .card-desc').forEach(el=>{
    const c=el.closest('.card'); if(c) fit(el,c);
  });
  document.querySelectorAll('.rew-card .rew-card-desc').forEach(el=>{
    const c=el.closest('.rew-card'); if(c) fit(el,c);
  });
}

function computeDesc(card,_mlOverride){
  if(card.isEnchant) return '契約に「'+card.enchantType+'」を付与する';
  const g=card.grade||1;
  const rawMl=_mlOverride!=null?_mlOverride:(typeof G!=='undefined'?G.magicLevel||1:1);
  // 黄金の雫・グリマルキン：G.alliesに実在する味方ユニットのみ適用（報酬プール/敵は対象外）
  const isCharCard=!card.type&&!card.kind; // キャラクター判定（type/kindなし）
  const isAllyUnit=isCharCard&&typeof G!=='undefined'&&G.allies&&G.allies.indexOf(card)>=0;
  const gmBonus=isAllyUnit&&typeof G!=='undefined'&&G.hasGoldenDrop?1:0;
  // グリマルキン：還魂回数分、味方ユニットの召喚数値に加算
  const grimBonus=isAllyUnit&&typeof G!=='undefined'?(G._grimalkinBonus||0):0;
  const ml=rawMl+gmBonus;
  let desc=_evalMath((card.desc||'').replace(/Grade/g,String(g)));
  // X=自身のATK のカードはATK実値で置換（golden drop による数値加算の対象になる）
  if(card.descXEqualsAtk&&card.atk!=null) desc=desc.replace(/X/g,String(card.atk));
  // グリマルキン：「数字/数字、」形式の召喚スタッツのみに grimBonus を加算
  // 黄金の雫：X表示と全ての残数値に gmBonus を加算
  // 両方ある場合：召喚スタッツは (gmBonus+grimBonus)、他の数値は gmBonus のみ
  if(grimBonus>0||gmBonus>0){
    const summonAtkBonus=gmBonus;            // ATK：黄金の雫のみ（ペリュトンはHPのみ）
    const summonHpBonus=gmBonus+grimBonus; // HP：黄金の雫＋ペリュトン
    if(summonAtkBonus>0||summonHpBonus>0){
      // 「数字/数字、」パターンのみを対象にする（±0/+1 や +X/+X などは絶対に対象外）
      desc=desc.replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>{
        return `<span style="color:var(--gold2);font-weight:700">${parseInt(a)+summonAtkBonus}/${parseInt(h)+summonHpBonus}</span>、`;
      });
    }
  }
  if(gmBonus>0){
    // X は杖のみ魔術レベルで置換（それ以外はXのまま）
    if(card.type==='wand'&&!card.subtype) desc=desc.replace(/X/g,`<span style="color:var(--gold2);font-weight:700">${ml}</span>`);
    // 黄金の雫：残りの全ての数字に gmBonus を加算
    // 除外：①（）内の数値（上限説明）・G1/G2等グレード記号・span化済み
    desc=desc.replace(/（[^）]*）|G\d+|<span[^>]*>[\s\S]*?<\/span>|\d+/g,m=>{
      if(m.startsWith('（')||/^G\d+$/.test(m)||m.startsWith('<span')) return m;
      return `<span style="color:var(--gold2);font-weight:700">${parseInt(m)+gmBonus}</span>`;
    });
  } else {
    if(card.type==='wand'&&!card.subtype) desc=desc.replace(/X/g,`<span style="color:#6dd;font-weight:700">${ml}</span>`);
  }
  // タイミングキーワードを太字化（「開戦：」「終戦：」等）
  desc=desc.replace(/(開戦|終戦|負傷|誘発|攻撃|召喚|常在|常時)：/g,'<strong>$1</strong>：');
  desc=desc.replace(/\n/g,'<br>');
  if(card.trigger==='on_damage_count'){
    const tgt=card.triggerCount||15;
    const ringInst=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.id===card.id):null;
    const rem=ringInst?Math.max(0,tgt-(ringInst._count||0)):tgt;
    desc+=`（あと${rem}回）`;
  } else if(card.trigger==='on_death_count'){
    const tgt=card.triggerCount||5;
    const ringInst=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.id===card.id):null;
    const rem=ringInst?Math.max(0,tgt-(ringInst._count||0)):tgt;
    desc+=`（あと${rem}回）`;
  }
  if(card.unique==='trials'){
    const ringInst=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.id===card.id):null;
    const prog=ringInst?ringInst._rerollProgress||0:0;
    desc+=`（あと${4-prog}回）`;
  }
  if(card.effect==='faun_wand'&&typeof G!=='undefined'&&G.allies&&G.allies.indexOf(card)>=0){
    const prog=card._faunWandCount||0;
    desc+=`（あと${Math.max(0,7-prog)}回）`;
  }
  return desc;
}

function mkCardEl(card,_idx,_ctx,_mlOverride){
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム'};
  const div=document.createElement('div');
  const t=card.type||'ring';
  const _isWandSub=t==='wand'&&card.subtype==='wand';
  const _subtypeClass=_isWandSub?' wand-sub':'';
  div.className=`card ${t}${_subtypeClass}${card.legend?' legend-card':''}`;
  if(card._isChar||(!card.type&&!card.kind)) div.classList.add('character-card');
  div.dataset.cardIdx=String(_idx);
  div.dataset.cardCtx=_ctx||'';
  if(typeof applyCardVisual==='function'){
    applyCardVisual(div,card);
  } else if(typeof getCardAsset==='function'&&typeof assetUrl==='function'){
    div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
  }
  const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
  const tpLabel=_isWandSub?'短杖':(typeLabel[t]||'指輪');
  const kindLabel='';
  // グレード（左・絶対配置）・価格バッジ（右・絶対配置）
  // 杖・消耗品は grade 未設定なので _rarity → rarity → 1 の順にフォールバック
  const _gradeNum=card.grade||(card._rarity)||((card.rarity>0)?card.rarity:null)||((card.type==='wand'||card.type==='consumable')?1:0);
  const gradeEl=_gradeNum?`<span class="card-grade${card.legend?' legend-grade':''}">${typeof gradeIconHtml==='function'?gradeIconHtml(_gradeNum):gradeStr(_gradeNum)}</span>`:'';
  // レッサーデーモン：報酬フェイズの次に購入する消耗品アイテムへ累積割引を表示反映
  const _ldDiscDisp=(typeof _lesserDemonDiscountFor==='function'&&G.phase==='reward')?_lesserDemonDiscountFor(card):0;
  const _dispPrice=card._buyPrice!=null?Math.max(0,card._buyPrice-_ldDiscDisp):null;
  const badgeEl=(card._buyPrice!=null&&G.phase==='reward')?`<span class="card-badge">${_circleCost(_dispPrice)}</span>`:'';
  // 杖のチャージ表示（テキスト下）
  const charges=card.type==='wand'
    ?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?'))
    :null;
  const _chargeColorClass=_isWandSub?' wand-sub':'';
  const chargeLabel=charges!==null?`<div class="card-charge${_chargeColorClass}">チャージ：${charges}</div>`:'';
  let atkLabel='', hpLabel='';
  if(card.kind==='summon'&&card.summon){
    const es=effectiveStats(card);
    if(es){
      const cs=es.count>1?'×'+es.count:'';
      atkLabel=`<span class="card-summon-atk">${es.atk}${cs}</span>`;
      hpLabel=`<span class="card-summon-hp">${es.hp}</span>`;
    }
  }
  const dynDesc=computeDesc(card,_mlOverride);
  if(div.classList.contains('character-card')){
    const _preview=_unitPreviewText(card,dynDesc);
    if(_preview) div.setAttribute('data-preview',_preview);
  }
  div.innerHTML=`${gradeEl}${badgeEl}<div class="card-art"></div><div class="card-tp ${t}${_subtypeClass}">${tpLabel}${kindLabel}</div><div class="card-name">${card.name}</div><div class="card-desc">${dynDesc}</div>${enc}${chargeLabel}${atkLabel}${hpLabel}`;
  return div;
}

function renderControls(){
  const badge=document.getElementById('ph-badge');
  const pp=document.getElementById('btn-pass');
  const dbg=document.getElementById('btn-debug-kill');
  if(G.phase==='player'){
    badge.className='ph-badge ph-player'; badge.textContent='プレイヤーターン';
    pp.style.display='';
    if(dbg) dbg.style.display=G._debugMode?'':'none';
  } else if(G.phase==='commander'){
    badge.className='ph-badge ph-enemy'; badge.textContent='司令官フェイズ';
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
  } else if(G.phase==='reward'){
    // 商談フェイズ：バッジはgoToReward()で設定済みなので上書きしない
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
  } else {
    badge.className='ph-badge ph-enemy'; badge.textContent='敵のターン';
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
  }
}

function setHint(t){ document.getElementById('hint-txt').textContent=t; }

function renderCommanderWands(){
  const bar=document.getElementById('commander-wands-bar');
  if(!bar) return;
  // ボス戦・報酬フェイズではenemy-hand-areaが代替表示するため非表示
  if(typeof _isBossFight!=='undefined'&&_isBossFight){ bar.style.display='none'; return; }
  if(G.phase==='reward'){ bar.style.display='none'; return; }
  const wands=G.commanderWands||[];
  if(!wands.length){ bar.style.display='none'; return; }
  bar.style.display='';
  bar.innerHTML='<span style="opacity:.6;font-size:.58rem;margin-right:4px">敵の杖：</span>'
    +wands.map(w=>`<span style="background:rgba(80,120,200,.18);border:1px solid rgba(80,120,200,.35);border-radius:3px;padding:1px 6px;font-size:.6rem;margin-right:3px;color:var(--blue2)">${w.name}</span>`).join('');
}

// 敵オーナーインベントリエリア（全階層・報酬フェイズ共通・プレイヤーインベントリと同形式）
function renderEnemyHand(){
  const area=document.getElementById('enemy-hand-area');
  if(!area) return;
  const isReward=G.phase==='reward'&&(G._masterHandReady||false);
  // 動的取得モード：指輪非表示・インベントリ3枠
  const isDynamic=!isReward&&(G._enemyHandDynamic||false);
  if(!['player','enemy','reward'].includes(G.phase)){ area.style.display='none'; return; }
  area.style.display='';

  // 指輪パネル（動的取得モード・報酬フェイズは非表示。戦闘中通常は表示）
  const ringsPane=document.getElementById('enemy-rings-pane');
  const ringsEl=document.getElementById('enemy-ring-slots');
  const ringCountEl=document.getElementById('enemy-ring-count');
  const ringMaxEl=document.getElementById('enemy-ring-max');
  const eHandPane=document.getElementById('enemy-hand-pane');
  if(ringsPane){
    if(isDynamic||isReward){
      ringsPane.style.display='none';
      if(eHandPane){
        eHandPane.style.flex='1';
        if(isReward){
          // 商談フェイズ：プレイヤー側インベントリと同じ幅制限
          const _playerHandEl=document.getElementById('hand-slots');
          if(_playerHandEl){
            const _phw=_playerHandEl.getBoundingClientRect().width;
            if(_phw>0) eHandPane.style.maxWidth=_phw+'px';
          } else {
            requestAnimationFrame(()=>{
              const _ph=document.getElementById('hand-slots');
              if(_ph){ const w=_ph.getBoundingClientRect().width; if(w>0) eHandPane.style.maxWidth=w+'px'; }
            });
          }
        }
      }
    } else {
      ringsPane.style.display='';
      if(eHandPane) eHandPane.style.maxWidth=''; // 戦闘時はmaxWidthを解除
      // 戦闘中は bossRings を表示
      const rings=G.bossRings||[];
      const eR=2;
      ringsPane.style.flex=eR;
      if(ringCountEl) ringCountEl.textContent=rings.filter(r=>r).length;
      if(ringMaxEl) ringMaxEl.textContent=eR;
      if(eHandPane) eHandPane.style.flex=Math.max(1,10-eR);
      if(ringsEl){
        ringsEl.innerHTML='';
        ringsEl.style.gridTemplateColumns=`repeat(${eR},1fr)`;
        for(let i=0;i<eR;i++){
          const ring=rings[i];
          if(ring){
            const div=mkCardEl(ring,i,'ring-boss');
            div.classList.add('inert'); div.style.cursor='default';
            ringsEl.appendChild(div);
          } else {
            const ph=document.createElement('div'); ph.className='card-empty'; ringsEl.appendChild(ph);
          }
        }
      }
    }
  }

  // インベントリパネル（動的モード=3枠、通常=8枠、報酬=handSlots）
  const handEl=document.getElementById('enemy-hand-slots');
  const handCountEl=document.getElementById('enemy-hand-count');
  const handMaxEl=document.getElementById('enemy-hand-max');
  if(!handEl) return;
  handEl.innerHTML='';
  const hand=isReward?(G.masterHand||[]):(G.bossHand||[]);
  // 報酬フェイズはプレイヤーと同じ列数にしてカードサイズを揃える
  const eHcols=5;
  const activeHand=5;
  handEl.style.gridTemplateColumns=`repeat(${eHcols},1fr)`;
  if(handCountEl) handCountEl.textContent=hand.filter(s=>s).length;
  if(handMaxEl) handMaxEl.textContent=activeHand;
  for(let i=0;i<eHcols;i++){
    if(i>=activeHand&&!hand[i]){
      const ph=document.createElement('div'); ph.className='card-empty spell'; ph.style.opacity='0.1'; handEl.appendChild(ph); continue;
    }
    const sp=hand[i]||null;
    if(sp){
      const div=mkCardEl(sp,i,'spell-enemy',isReward?undefined:(G.enemyMagicLevel||G.magicLevel));
      if(sp._isTreasure) div.classList.add('treasure');
      if(isReward){
        // 報酬フェイズ：クリックまたはドラッグで購入
        // レッサーデーモン：次に購入する消耗品アイテムへ累積割引を表示反映
        const _ldDiscMH=(typeof _lesserDemonDiscountFor==='function')?_lesserDemonDiscountFor(sp):0;
        const cost=Math.max(0,(sp._buyPrice??2)-_ldDiscMH);
        const canBuy=G.gold>=cost;
        if(canBuy){
          div.style.cursor='pointer';
          div.onclick=()=>buyMasterHandItem(i);
          div.draggable=true;
          div.addEventListener('dragstart',e=>{
            _rewDragSrc=-100-i; // 特殊インデックスでインベントリドラッグを識別
            e.dataTransfer.effectAllowed='move';
            e.dataTransfer.setDragImage(_transparentDragImg,0,0);
            _createDragGhost(div);
          });
          div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
          div.addEventListener('dragend',()=>{ _rewDragSrc=-1; _removeDragGhost(); });
        } else {
          div.style.cursor='default';
          div.style.background='var(--bg)';
          const nb=document.createElement('div');
          nb.textContent='ソウル不足';
          nb.style.cssText='position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10';
          div.appendChild(nb);
          const tp=div.querySelector('.card-tp');
          if(tp) tp.style.marginTop='16px';
        }
      } else {
        div.classList.add('inert'); div.style.cursor='default';
      }
      handEl.appendChild(div);
    } else {
      const ph=document.createElement('div'); ph.className='card-empty spell'; handEl.appendChild(ph);
    }
  }
}

// 秘術情報バー（常時表示）
function renderArcanaBar(){
  const bar=document.getElementById('arcana-bar');
  if(!bar) return;
  const arc=G.arcana;
  if(!arc){ bar.style.display='none'; return; }
  bar.style.display='';
  const typeStr=arc.type==='passive'?'パッシブ':arc.cost>0?arc.cost+'ソウル':'無料';
  const usedStr=(arc.type==='active'&&G.arcanaUsed)?' 【使用済】':'';
  bar.innerHTML=`<div style="max-width:1100px;margin:0 auto;padding:0 12px"><span style="opacity:.7">秘術</span> ${arc.icon} <strong>${arc.id}</strong>（${typeStr}）${usedStr} <span style="color:var(--text2);font-size:.6rem">${arc.desc}</span></div>`;
}

// ── 撤退確認オーバーレイ ──────────────────────────
function showRetreatConfirm(mv){
  const ov=document.createElement('div');
  ov.style='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px';

  const title=document.createElement('div');
  title.style='font-size:1.2rem;font-weight:700;color:var(--text)';
  title.textContent='戦闘を離脱しますか？';
  ov.appendChild(title);

  const row=document.createElement('div');
  row.style='display:flex;gap:16px';

  const btnYes=document.createElement('button');
  btnYes.textContent='撤退する';
  btnYes.style='padding:10px 28px;background:var(--bad,#c44);color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer';
  btnYes.onclick=()=>{ ov.remove(); G._retreatTargetNodeType=mv; retreat(); };

  const btnNo=document.createElement('button');
  btnNo.textContent='キャンセル';
  btnNo.style='padding:10px 28px;background:var(--card,#333);color:var(--text);border:1px solid var(--text2,#888);border-radius:8px;font-size:1rem;cursor:pointer';
  btnNo.onclick=()=>ov.remove();

  row.appendChild(btnYes);
  row.appendChild(btnNo);
  ov.appendChild(row);
  document.body.appendChild(ov);
}

(function installClearAllySelectionOnOutsideClick(){
  if(typeof window==='undefined'||window.__vbClearAllySelectionOnOutsideClick) return;
  window.__vbClearAllySelectionOnOutsideClick=true;
  document.addEventListener('click',e=>{
    if(typeof G==='undefined'||!_hasExplicitSelectedAlly()) return;
    const t=e.target;
    if(!t||!t.closest) return;
    if(t.closest('.unit-card')) return;
    if(t.closest('#hand-slots')||t.closest('#ring-slots')||t.closest('#kw-tooltip')) return;
    if(t.closest('button')||t.closest('.btn')||t.closest('.map-node')||t.closest('.card')) return;
    clearAllyLoadoutSelection();
  });
})();
