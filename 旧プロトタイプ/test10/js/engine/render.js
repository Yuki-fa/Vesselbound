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
    tip.innerHTML=_formatPreviewHtml(desc);
    tip.style.display='block';
    _posKwTip(tip,e);
  });
})();
function _escapePreviewHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function _formatPreviewHtml(desc){
  const clean=String(desc||'').replace(/<\/?strong>/gi,'').replace(/<[^>]*>/g,'');
  return clean.split('\n').map((line,li)=>{
    if(li===0) return `<strong class="preview-title">${_escapePreviewHtml(line)}</strong>`;
    const m=line.match(/^([^：:]+)([：:])(.*)$/);
    if(!m) return _escapePreviewHtml(line);
    let body=_escapePreviewHtml(m[3]);
    if(m[1]==='キーワード'){
      body=body.split(/\s*\/\s*/).map(k=>k.trim()?`<strong>${_escapePreviewHtml(k.trim())}</strong>`:'').filter(Boolean).join(' / ');
    }
    return `<strong>${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`;
  }).join('<br>');
}
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
  const arr=[];
  [...(document.getElementById('f-ally')?.querySelectorAll('.slot')||[])].forEach((slot,pos)=>{
    const idx=slot.dataset&&slot.dataset.unitIdx!=null?parseInt(slot.dataset.unitIdx,10):pos;
    arr[idx]=slot;
  });
  return arr;
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
  const slotH=(W-49)/7*88/63;
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
  const maxAllies=MAX_ALLIES||5;
  const maxEnemies=MAX_ENEMIES||8;
  const allyDeathCount  =new Array(maxAllies).fill(0);
  const enemyDeathCount =new Array(maxEnemies).fill(0);
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

      // 1ターン分シミュレーション（battlePhaseと同じく「味方左端→敵左端」を交互）
      let nextAlly=0;
      let nextEnemy=0;
      let safety=0;
      while(safety++<500){
        const ai=typeof _nextLiveIndex==='function'?_nextLiveIndex(G.allies,nextAlly,false):_drNextLiveIndex(G.allies,nextAlly,false);
        const ei=typeof _nextLiveIndex==='function'?_nextLiveIndex(G.enemies,nextEnemy,true):_drNextLiveIndex(G.enemies,nextEnemy,true);
        if(ai<0&&ei<0) break;
        if(ai>=0){
          nextAlly=(ai+1)%maxAllies;
          const a=G.allies[ai];
          if(a&&a.hp>0&&!a._isSoul) _drSimAllySlot(a,ai);
          if(!G.allies.some(a=>a&&a.hp>0&&!a._isSoul)||!G.enemies.some(e=>e&&e.hp>0&&!e._isObject)) break;
        }
        if(ei>=0){
          nextEnemy=(ei+1)%maxEnemies;
          const e=G.enemies[ei];
          if(e&&e.hp>0&&!e._isObject) _drSimEnemySlot(e,ei);
          if(!G.allies.some(a=>a&&a.hp>0&&!a._isSoul)||!G.enemies.some(e=>e&&e.hp>0&&!e._isObject)) break;
        }
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

function _drNextLiveIndex(units,startIdx,skipObjects=false){
  const max=skipObjects?(MAX_ENEMIES||8):(MAX_ALLIES||5);
  for(let off=0;off<max;off++){
    const idx=(startIdx+off)%max;
    const u=units[idx];
    if(u&&u.hp>0&&(!skipObjects||!u._isObject)&&!u._isSoul) return idx;
  }
  return -1;
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
    const defenderAtk=t.atk||0;
    dealDmgToEnemy(t,ally.atk,G.enemies.indexOf(t),ally);
    if(typeof _dealMutualAttackDamage==='function') _dealMutualAttackDamage(ally,false,t,defenderAtk);
    if(typeof _maybeCounterAttack==='function') _maybeCounterAttack(t,false,ally);
  });
  if(ally.hp>0&&!isGlobal&&!isTriDir){
    const extra=ally.keywords&&ally.keywords.includes('三段攻撃')?2:ally.keywords&&ally.keywords.includes('二段攻撃')?1:0;
    let cur=target;
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ cur=getAttackTarget(ally,G.enemies); if(!cur) break; }
      if(ally.hp>0) _applyAllyAttackEffectsWithElf(ally);
      const defenderAtk=cur.atk||0;
      dealDmgToEnemy(cur,ally.atk,G.enemies.indexOf(cur),ally);
      if(typeof _dealMutualAttackDamage==='function') _dealMutualAttackDamage(ally,false,cur,defenderAtk);
      if(typeof _maybeCounterAttack==='function') _maybeCounterAttack(cur,false,ally);
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
    const defenderAtk=tgt.atk||0;
    dealDmgToAlly(tgt,atkVal,G.allies.indexOf(tgt),enemy);
    if(typeof _dealMutualAttackDamage==='function') _dealMutualAttackDamage(enemy,true,tgt,defenderAtk);
    if(typeof _maybeCounterAttack==='function') _maybeCounterAttack(tgt,true,enemy);
    hitSet.add(tgt.id);
  });
  if(!isGlobal&&!isTriDir&&enemy.hp>0){
    const extra=enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0;
    let cur=finalT[0];
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ cur=getAttackTarget(enemy,G.allies); if(!cur) break; }
      if(!cur||cur.hp<=0) break;
      if(enemy.hp>0) _applyEnemyAttackEffectsWithElf(enemy);
      const defenderAtk=cur.atk||0;
      dealDmgToAlly(cur,enemy.atk,G.allies.indexOf(cur),enemy);
      if(typeof _dealMutualAttackDamage==='function') _dealMutualAttackDamage(enemy,true,cur,defenderAtk);
      if(typeof _maybeCounterAttack==='function') _maybeCounterAttack(cur,true,enemy);
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
  const kws=[...new Set([...(unit.keywords||[]),...(unit.counter?['反撃']:[])])].filter(Boolean);
  if(kws.length) lines.push(`キーワード：${kws.join(' / ')}`);
  if(desc) lines.push(`効果：\n${desc}`);
  const panelEffects=(unit.equipment||[]).filter(Boolean).filter(p=>{
    const cat=String(p.category||'');
    return !cat.includes('戦闘力')&&!p.atkBonus&&!p.hpBonus;
  }).map(p=>{
    const d=typeof computeDesc==='function'?computeDesc(p):p.desc;
    return d?`${p.name}：${d}`:p.name;
  });
  if(panelEffects.length) lines.push(`パネル：\n${panelEffects.join('\n')}`);
  return lines.join('\n');
}

function renderField(id,units,isEnemy,_extDeathRisk,_lane,_extWarnRisk,_extDeathProb){
  const el=document.getElementById(id);
  el.innerHTML='';
  const deathRisk=_extDeathRisk!=null?_extDeathRisk:(()=>{
    const _dr=G.phase==='player'?_computeDeathRisk():_emptyDR;
    return isEnemy?_dr.enemyRisk:_dr.allyRisk;
  })();
  const warnRisk=_extWarnRisk!=null?_extWarnRisk:new Map();
  const deathProb=_extDeathProb!=null?_extDeathProb:new Map();
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
  const _rearIndexes=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&(x.u.lane||'front')==='rear').map(x=>x.i);
  const _frontIndexes=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&(x.u.lane||'front')!=='rear').map(x=>x.i);
  const renderIndexes=isEnemy
    ?Array.from({length:MAX_ENEMIES||10},(_,idx)=>idx)
    :Array.from({length:MAX_ALLIES||10},(_,idx)=>idx);
  el.style.setProperty('grid-template-columns',`repeat(${ENEMY_FRONT_SLOTS||5},var(--unit-card-w))`,'important');
  el.style.setProperty('justify-content','center','important');
  const _rearStart=Math.floor(((ENEMY_FRONT_SLOTS||5)-_rearIndexes.length)/2)+1;
  const _frontStart=Math.floor(((ENEMY_FRONT_SLOTS||5)-_frontIndexes.length)/2)+1;
  for(const i of renderIndexes){
    const rawU=units[i];
    const u=rawU;
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    slot.dataset.unitIdx=i;
    slot.style.setProperty('width','var(--unit-card-w)','important');
    slot.style.setProperty('min-width','var(--unit-card-w)','important');
    slot.style.setProperty('max-width','var(--unit-card-w)','important');
    slot.style.setProperty('height','var(--unit-card-h)','important');
    slot.style.setProperty('min-height','var(--unit-card-h)','important');
    slot.style.setProperty('max-height','var(--unit-card-h)','important');
    slot.style.setProperty('aspect-ratio','450 / 605','important');
    slot.style.setProperty('flex','0 0 var(--unit-card-w)','important');
    slot.style.setProperty('pointer-events','auto','important');
    // 敵スロットのレーン：生存敵はu.lane、死亡/空スロットはmoveMaskLanesで補完
    const _slotLane=isEnemy?(u&&u.hp>0?u.lane:(G.moveMaskLanes?.[i]||(i>=5?'rear':'front'))):(u&&u.hp>0?(u.lane||'front'):(i>=5?'rear':'front'));
    if(!u||u.hp<=0){
      slot.style.gridRow=_slotLane==='rear'?'1':'2';
      slot.style.gridColumn=String((i%5)+1);
    }
    if(u&&u.hp>0){
      const _row=_slotLane==='rear'?1:2;
      slot.style.gridRow=String(_row);
      slot.style.gridColumn=String((i%5)+1);
    }
    if(isEnemy&&_slotLane==='rear') slot.classList.add('is-rear');
    if(isEnemy&&_slotLane!=='rear') slot.classList.add('is-front');
    const _hasGuardPanel=!isEnemy&&u&&((typeof _unitHasKeyword==='function'&&_unitHasKeyword(u,'守護'))||((u.equipment||[]).some(p=>p&&(p.name==='守護'||(p.keywords||[]).includes('守護')))));
    if(_hasGuardPanel) slot.classList.add('is-defender','uses-hate-frame');
    if(u&&u.hp>0&&u.hate&&u.hateTurns>0) slot.classList.add('is-defender');
    if(u&&u.hp>0&&u.hate&&u.hateTurns>0) slot.classList.add('uses-hate-frame');
    if(u&&(!isEnemy||u.hp>0)){
      slot.classList.add('unit-card');
      if(G.phase==='player'&&G._selectedBattleMagic){
        const mn=G._selectedBattleMagic.name;
        const canTarget=mn==='憑依' ? !isEnemy
          : (mn==='破滅'||mn==='縮小化'||mn==='隕石') ? isEnemy
          : true;
        if(canTarget&&u.hp>0) slot.classList.add('magic-target');
      }
      if(u.hp<=0) slot.classList.add('dead-unit','inert');
      if(!isEnemy&&G._selectedEquipUnitIdx===i) slot.classList.add('selected');
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
        const _allKws=[...new Set([...(u.keywords||[]),...(u.counter?['反撃']:[])])];
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:1px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
        const gradeTag=u.grade?`<div class="slot-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(u.grade):gradeStr(u.grade)}</div>`:'';
        const _rawDesc=u.desc?computeDesc(u):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
        const _preview=_unitPreviewText(u,_desc);
        if(_preview) slot.setAttribute('data-preview',_preview);
        const _hpClass=(u.maxHp!=null&&u.hp<u.maxHp)?'h hp-damaged':'h';
        const _hpMax=Math.max(1,u.maxHp||u.hp||1);
        const _hpPct=Math.max(0,Math.min(100,Math.round((Math.max(0,u.hp||0)/_hpMax)*100)));
        const hpBar=`<div class="slot-life-bar" title="ライフ ${Math.max(0,u.hp||0)}/${_hpMax}"><div class="slot-life-fill" style="width:${_hpPct}%"></div></div>`;
        const raceTag=u.race&&u.race!=='-'?`<div class="slot-race">${u.race}</div>`:'';
        const _isObj=!!u._isObject;
        const _probPct=_isObj?null:deathProb.get(i);
        let _zone=null;
        if(!_isObj&&u.hp>0){
          if(_probPct!=null){
            _zone=_probPct>=100?{cls:'will-die',label:'💀',color:'#ff6060'}:_probPct<=20?{cls:'will-warn-low',label:'死亡確率・小',color:'#f0d000'}:_probPct<=79?{cls:'will-warn-mid',label:'死亡確率・中',color:'#f09000'}:{cls:'will-warn-high',label:'死亡確率・大',color:'#e04800'};
          } else if(deathRisk&&deathRisk.has&&deathRisk.has(i)){
            _zone={cls:'will-die',label:'💀',color:'#ff6060'};
          } else if(warnRisk&&warnRisk.has&&warnRisk.has(i)){
            const _lv=warnRisk.get(i);
            _zone=_lv==='high'?{cls:'will-warn-high',label:'死亡確率・大',color:'#e04800'}:_lv==='mid'?{cls:'will-warn-mid',label:'死亡確率・中',color:'#f09000'}:{cls:'will-warn-low',label:'死亡確率・小',color:'#f0d000'};
          }
        }
        const _probTag=_zone!=null?`<div class="death-prob-label" style="position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:.52rem;font-weight:700;z-index:3;white-space:nowrap;pointer-events:none;color:${_zone.color}">${_zone.label}</div>`:'';
        const _riskTag=_zone!=null?'<div class="risk-particles"></div>':'';
        // 情報ブロック：絶対配置でカード全体に広げ中央固定
        // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
        const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
        const _btmStyle='position:absolute;bottom:6px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0;z-index:1;pointer-events:auto';
        slot.style.borderTop='2px solid var(--teal2)';
        if(isEnemy){
          slot.innerHTML=`${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}${_probTag}${_riskTag}<div class="unit-portrait"></div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        } else {
          const dragonetSub=u.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(u._dragonetBonus||0))-(u._dragonetCount||0)}戦</div>`:'';
          slot.innerHTML=`${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}${_probTag}${_riskTag}<div class="unit-portrait"></div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div>`;
        }
        const hitLayer=document.createElement('div');
        hitLayer.className='unit-hit-layer';
        if(_preview) hitLayer.setAttribute('data-preview',_preview);
        hitLayer.addEventListener('click',e=>{
          if(G.phase==='player'&&G._selectedBattleMagic&&typeof applySelectedBattleMagic==='function'){
            e.preventDefault();
            e.stopPropagation();
            applySelectedBattleMagic(isEnemy?'enemy':'ally',i);
          }
        },true);
        slot.appendChild(hitLayer);
        slot._hitLayer=hitLayer;
        // オブジェクトは攻撃対象外なので赤枠・死亡予測は表示しない
        if(!_isObj){
          // 事前の攻撃対象予告は表示しない。発光は選択中キャラと攻撃演出中だけに限定する。
          // ラベルと同じ閾値で枠色を決定（100%=will-die / 80-99%=high / 21-79%=mid / 1-20%=low）
          if(_zone) slot.classList.add(_zone.cls);
        }
      }
      if(u&&!isEnemy){
        const canMoveUnit=G.phase!=='player'&&G.phase!=='enemy';
        slot.draggable=canMoveUnit;
        slot.addEventListener('dragstart',e=>{
          if(!canMoveUnit) { e.preventDefault(); return; }
          window._allySlotDragSrc=i;
          e.dataTransfer.effectAllowed='move';
        });
        slot.addEventListener('dragend',()=>{ window._allySlotDragSrc=null; });
        slot.addEventListener('dragover',e=>{
          if(!canMoveUnit||window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(!canMoveUnit) return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            const tmp=G.allies[src];
            G.allies[src]=G.allies[i];
            G.allies[i]=tmp;
            if(G.allies[i]) G.allies[i].lane=i>=5?'rear':'front';
            if(G.allies[src]) G.allies[src].lane=src>=5?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
        slot.onclick=()=>{
          if(G.phase==='player'&&G._selectedBattleMagic&&typeof applySelectedBattleMagic==='function'){
            applySelectedBattleMagic('ally',i);
            return;
          }
          if(G.phase==='player') return;
          if(G._selectedEquipUnitIdx!==i) G._selectedEquipCardIdx=null;
          G._selectedEquipUnitIdx=i;
          G._showGlobalPanels=false;
          G._showPlayerHand=false;
          renderAll();
          if(typeof renderHandEditor==='function') renderHandEditor();
        };
        if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
      }
      if(u&&isEnemy&&u.hp>0&&G.phase==='player'){
        slot.onclick=()=>{
          if(G._selectedBattleMagic&&typeof applySelectedBattleMagic==='function'){
            applySelectedBattleMagic('enemy',i);
            return;
          }
          const unitIdx=G._selectedEquipUnitIdx;
          const equipIdx=G._selectedEquipCardIdx;
          const ally=G.allies&&G.allies[unitIdx];
          const card=ally&&ally.equipment&&ally.equipment[equipIdx];
          if(!ally||ally.hp<=0||equipIdx==null||equipIdx<0||!card) return;
          if(card.fixedAttack&&typeof useFixedEquipOnEnemy==='function'){
            useFixedEquipOnEnemy(unitIdx,equipIdx,i);
            return;
          }
          if(!card.fixedEquip&&typeof useDraggedSpellOnTarget==='function'){
            const prev=G.spells;
            G.spells=ally.equipment;
            G._unitEquipSpellRestore=prev;
            useDraggedSpellOnTarget(equipIdx,'enemy',i);
            if(typeof _restoreUnitEquipSpellSource==='function') _restoreUnitEquipSpellSource();
          }
        };
        if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
      }
      if(u&&u.hp>0&&G.phase==='player'&&typeof useDraggedSpellOnTarget==='function'){
        slot.addEventListener('dragover',e=>{
          if(isEnemy&&window._fixedEquipDrag){
            e.preventDefault();
            slot.classList.add('drag-over');
            return;
          }
          const si=window._spellDragIdx;
          if(si==null) return;
          const sp=G.spells&&G.spells[si];
          const who=isEnemy?'enemy':'ally';
          if(!sp) return;
          if((sp.needsEnemy&&who!=='enemy')||(sp.needsAlly&&who!=='ally')) return;
          if(!sp.needsEnemy&&!sp.needsAlly&&!sp.needsAny) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(isEnemy&&window._fixedEquipDrag&&typeof useFixedEquipOnEnemy==='function'){
            e.preventDefault();
            slot.classList.remove('drag-over');
            useFixedEquipOnEnemy(window._fixedEquipDrag.unitIdx, window._fixedEquipDrag.equipIdx, i);
            window._fixedEquipDrag=null;
            return;
          }
          const si=window._spellDragIdx;
          if(si==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          useDraggedSpellOnTarget(si,isEnemy?'enemy':'ally',i);
          window._spellDragIdx=null;
        });
      }
    } else if(isEnemy&&G.phase==='reward'&&G.visibleMoves.includes(i)&&G.moveMasks[i]&&(!u||u.hp<=0)&&(!_lane||_slotLane===_lane)){
      const _mvType=G.moveMasks[i];
      const nt=NODE_TYPES[_mvType];
      // 宝・移動マスはインベントリカード相当のサイズで上部に表示（前衛キャラの背後に隠れる）
      slot.classList.remove('is-rear');
      slot.classList.add('has-mini-card');
      const _isChestMask=String(_mvType).startsWith('chest');
      if(_isChestMask){
        const _ctp=_mvType==='chest_ring'?'ring':_mvType==='chest_wand'?'wand':_mvType==='chest_item'?'consumable':'wand';
        slot.innerHTML=`<div class="mini-card chest-mini ${_ctp}"><div class="mini-tp"></div><div class="mini-q">？</div><div class="mini-hint">+1消費</div></div>`;
        slot.title='クリックで取得（行動力-1）';
        slot.onclick=()=>{
          if(typeof onChestClick==='function') onChestClick(i);
        };
      } else {
        slot.innerHTML=`<div class="mini-card move-mini"><div class="mini-icon">${nt.icon}</div><div class="mini-lbl"></div></div>`;
        slot.title='クリックで撤退';
        slot.onclick=()=>{
          if(G.phase!=='player') return;
          showRetreatConfirm(_mvType);
        };
      }
    } else {
      slot.classList.add('empty');
      if(!isEnemy){
        slot.addEventListener('dragover',e=>{
          if(G.phase==='player'||G.phase==='enemy') return;
          if(window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(G.phase==='player'||G.phase==='enemy') return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            G.allies[i]=G.allies[src];
            G.allies[src]=null;
            if(G.allies[i]) G.allies[i].lane=i>=5?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
      }
    }
    el.appendChild(slot);
  }
}

function renderHand(){
  if(typeof renderHandEditor==='function'){
    renderHandEditor();
    return;
  }
  renderRingSlots();
  renderHandSlots();
}

let _selectedRingIdx=-1;

function renderRingSlots(){
  const el=document.getElementById('ring-slots');
  if(!el) return;
  // 旧row2は非表示
  const extraRow=document.getElementById('ring-extra-row');
  if(extraRow) extraRow.style.display='none';
  el.innerHTML='';
  const R=G.ringSlots;
  el.style.gridTemplateColumns=`repeat(${R},1fr)`;
  const ringPane=document.getElementById('ring-pane');
  if(ringPane) ringPane.style.flex=R;
  const handPane=document.getElementById('hand-pane');
  if(handPane) handPane.style.flex=10-R;
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=G.rings.filter(r=>r).length;
  const rm=document.getElementById('ring-max');   if(rm) rm.textContent=R;

  for(let i=0;i<R;i++){
    const ring=G.rings[i];
    if(ring){
      const div=mkCardEl(ring,i,'ring-battle');
      if(i===_selectedRingIdx){
        div.style.outline='2px solid var(--gold2)';
        div.style.opacity='0.75';
      }
      div.style.cursor='pointer';
      div.onclick=()=>{
        if(_selectedRingIdx===-1){
          _selectedRingIdx=i;
        } else if(_selectedRingIdx===i){
          _selectedRingIdx=-1;
        } else {
          // swap
          const tmp=G.rings[_selectedRingIdx];
          G.rings[_selectedRingIdx]=G.rings[i];
          G.rings[i]=tmp;
          _selectedRingIdx=-1;
        }
        renderRingSlots();
      };
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty';
      if(_selectedRingIdx>=0){
        ph.style.cursor='pointer';
        ph.style.outline='1px dashed var(--gold)';
        ph.onclick=()=>{
          G.rings[i]=G.rings[_selectedRingIdx];
          G.rings[_selectedRingIdx]=null;
          _selectedRingIdx=-1;
          renderRingSlots();
        };
      }
      el.appendChild(ph);
    }
  }
}

// インベントリスロット（杖＋消耗品の混合 7 枠）
function renderHandSlots(){
  const el=document.getElementById('hand-slots');
  if(!el) return;
  el.innerHTML='';
  const H=G.handSlots||7;
  const Hcols=H;
  el.style.gridTemplateColumns=`repeat(${Hcols},var(--hand-card-w,300px))`;
  const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s).length;
  const hm=document.getElementById('hand-max');   if(hm) hm.textContent=H;

  for(let i=0;i<Hcols;i++){
    const handMid=(Math.min(H,Hcols)-1)/2;
    const handArc=Math.abs(i-handMid);
    if(i>=H){
      // 未解放スロット：極めて薄い表示
      const ph=document.createElement('div');
      ph.className='card-empty spell'; ph.style.opacity='0.1';
      ph.style.setProperty('--hand-i',i);
      ph.style.setProperty('--hand-mid',handMid);
      ph.style.setProperty('--hand-arc',handArc);
      el.appendChild(ph);
      continue;
    }
    const sp=G.spells[i];
    if(sp){
      const div=mkCardEl(sp,i,'spell-battle');
      const isWand=sp.type==='wand';
      const hasCharge=sp.usesLeft===undefined||sp.usesLeft>0;
      const inReward=G.phase==='reward';
      const inMap=G.phase==='map';
      const actionCost=sp.actionCost==null?1:Math.max(0,sp.actionCost);
      const canUse=(G.phase==='player'||inReward||inMap)&&(isWand?(inReward||inMap?hasCharge:G.actionsLeft>=actionCost&&hasCharge):(inReward||inMap||G.actionsLeft>=actionCost));
      if(canUse){ div.classList.remove('inert'); div.onclick=()=>useSpell(i); }
      else       { div.classList.add('inert'); }
      div.draggable=false;
      div.style.setProperty('--hand-i',i);
      div.style.setProperty('--hand-mid',handMid);
      div.style.setProperty('--hand-arc',handArc);
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      ph.style.setProperty('--hand-i',i);
      ph.style.setProperty('--hand-mid',handMid);
      ph.style.setProperty('--hand-arc',handArc);
      el.appendChild(ph);
    }
  }
}

// グレード表示（G10=★）— reward.js でも参照
function gradeStr(g){
  const n=1;
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
    if((card.type==='wand'&&!card.subtype)||card.magicPanel) desc=desc.replace(/X/g,`<span style="color:var(--gold2);font-weight:700">${ml}</span>`);
    // 黄金の雫：残りの全ての数字に gmBonus を加算
    // 除外：①（）内の数値（上限説明）・G1/G2等グレード記号・span化済み
    desc=desc.replace(/（[^）]*）|G\d+|<span[^>]*>[\s\S]*?<\/span>|\d+/g,m=>{
      if(m.startsWith('（')||/^G\d+$/.test(m)||m.startsWith('<span')) return m;
      return `<span style="color:var(--gold2);font-weight:700">${parseInt(m)+gmBonus}</span>`;
    });
  } else {
    if((card.type==='wand'&&!card.subtype)||card.magicPanel) desc=desc.replace(/X/g,`<span style="color:#6dd;font-weight:700">${ml}</span>`);
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
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム','global-panel':'全体'};
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
  // 杖のチャージ表示（左上）
  const isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
  const isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
  const isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
  const isActionPanel=card&&(card.fixedAttack||card.fixedEquip||((card.type==='panel'||card.kind==='panel'||card.panelScope)&&!isPassivePanel&&!isCombatPowerPanel&&card.panelScope!=='global'));
  const charges=card.type==='wand'
    ?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?'))
    :(!isPanelCard&&isActionPanel)?(card.cost>0?card.cost:1)
    :null;
  const _chargeColorClass=_isWandSub?' wand-sub':'';
  const chargeLabel=charges!==null?`<div class="card-charge${_chargeColorClass}">${charges}</div>`:'';
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
    pp.textContent='ターン終了';
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
  bar.style.display='none';
  bar.innerHTML='';
}

// 敵オーナーインベントリエリア（全階層・報酬フェイズ共通・プレイヤーインベントリと同形式）
function renderEnemyHand(){
  const area=document.getElementById('enemy-hand-area');
  if(!area) return;
  const isReward=G.phase==='reward'&&(G._masterHandReady||false);
  if(!isReward){ area.style.display='none'; return; }
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
        if(isReward&&!G._isShop){
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
        } else if(eHandPane){
          eHandPane.style.maxWidth='';
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
  if(isReward&&!G._isShop&&typeof renderFacilitiesRow==='function'){
    handEl.classList.remove('shop-sale-hand');
    if(eHandPane) eHandPane.style.maxWidth='';
    renderFacilitiesRow();
    if(handCountEl) handCountEl.textContent='6';
    if(handMaxEl) handMaxEl.textContent='6';
    return;
  }
  handEl.classList.remove('facility-slots');
  handEl.classList.toggle('shop-sale-hand',!!G._isShop);
  const hand=isReward?(G.masterHand||[]):(G.bossHand||[]);
  // 報酬フェイズはプレイヤーと同じ列数にしてカードサイズを揃える
  const eHcols=G._isShop?9:5;
  const activeHand=G._isShop?9:5;
  handEl.style.gridTemplateColumns=`repeat(${eHcols},var(--item-card-w))`;
  if(handCountEl) handCountEl.textContent=hand.filter(s=>s).length;
  if(handMaxEl) handMaxEl.textContent=activeHand;
  for(let i=0;i<eHcols;i++){
    if(i>=activeHand&&!hand[i]){
      const ph=document.createElement('div'); ph.className='card-empty spell'; ph.style.opacity='0.1'; handEl.appendChild(ph); continue;
    }
    const sp=hand[i]||null;
    if(sp){
      const div=mkCardEl(sp,i,'spell-enemy',isReward?undefined:(G.enemyMagicLevel||G.magicLevel));
      if(isReward&&G._pendingPanelPlacement&&G._pendingPanelPlacement.masterIdx===i) div.classList.add('pending-placement');
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
          nb.textContent='ゴールド不足';
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
  const typeStr=arc.type==='passive'?'パッシブ':arc.cost>0?arc.cost+'ゴールド':'無料';
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
