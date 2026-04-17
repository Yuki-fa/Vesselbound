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
  function _getTarget(e){
    return e.target.closest('.slot-badge[data-kwdesc]')||e.target.closest('[data-preview]');
  }
  document.addEventListener('mouseover',e=>{
    if(_dragging){ tip.style.display='none'; return; }
    const el=_getTarget(e);
    if(!el){ tip.style.display='none'; return; }
    const kd=el.getAttribute('data-kwdesc'), pv=el.getAttribute('data-preview');
    const desc=kd||pv;
    if(!desc){ tip.style.display='none'; return; }
    tip.textContent=desc;
    tip.style.display='block';
    _posKwTip(tip,e);
  });
  document.addEventListener('mousemove',e=>{
    if(_dragging){ tip.style.display='none'; return; }
    if(tip.style.display==='none') return;
    if(!_getTarget(e)){ tip.style.display='none'; return; }
    _posKwTip(tip,e);
  });
  document.addEventListener('mouseout',e=>{
    const rt=e.relatedTarget;
    if(!rt||((!rt.closest('.slot-badge[data-kwdesc]'))&&(!rt.closest('[data-preview]')))) tip.style.display='none';
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
  const _drResult=G.phase==='player'?_computeDeathRisk():_emptyDR;
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

  // ログ・描画関数を無効化
  const _L=window.log,_R=window.renderAll,_U=window.updateHUD,_RC=window.renderControls;
  window.log=()=>{}; window.renderAll=()=>{}; window.updateHUD=()=>{}; window.renderControls=()=>{};

  const N=20; // シミュレーション回数
  const allyDeathCount  =new Array(6).fill(0);
  const enemyDeathCount =new Array(6).fill(0);
  const origAliveIds=_sA.map(a=>a&&a.hp>0?a.id:null);
  const origEnemyIds=_sE.map(e=>e&&e.hp>0?e.id:null);

  try{
    for(let trial=0;trial<N;trial++){
      // ── 毎回クローンを差し込んでシミュレーション ──
      G.allies  =_sA.map(a=>a?JSON.parse(JSON.stringify(a)):null);
      G.enemies =_sE.map(e=>e?JSON.parse(JSON.stringify(e)):null);
      G.battleCounters={damage:0,deaths:0};
      G.visibleMoves=[...(_sVM||[])];
      G.moveMasks=[...(_sMM||[])];
      G._pendingTreasure=_sPT;

      // 1ターン分シミュレーション（全生存ユニットが1回ずつ行動）
      const _simEnemies=G.enemies.map((e,i)=>({u:e,i})).filter(({u})=>u&&u.hp>0);
      const _simAllies =G.allies .map((a,i)=>({u:a,i})).filter(({u})=>u&&u.hp>0&&!u._isSoul);
      const _simLen=Math.max(_simEnemies.length,_simAllies.length);
      for(let _si=0;_si<_simLen;_si++){
        if(_si<_simEnemies.length){
          const {u:e,i:ei}=_simEnemies[_si];
          if(e.hp>0) _drSimEnemySlot(e,ei);
        }
        if(!G.allies.some(a=>a&&a.hp>0)) break;
        if(_si<_simAllies.length){
          const {u:a,i:ai}=_simAllies[_si];
          if(a.hp>0&&!a._isSoul) _drSimAllySlot(a,ai);
        }
        if(!G.enemies.some(e=>e&&e.hp>0)) break;
      }
      // 標的ターン消費（1ラウンド分）
      G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });

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
    // ── 状態を完全復元 ──
    G.allies=_sA; G.enemies=_sE;
    G.gold=_sGold; G.earnedGold=_sEarned;
    G.battleCounters=_sBC; G._pendingTreasure=_sPT; G._eliteKilled=_sEK;
    G.visibleMoves=_sVM; G.moveMasks=_sMM;
    G.phase=_sPhase; G._pendingSkelRevive=_sSkelRevive;
    G._undeadHpBonus=_sUndeadBonus; G.enemyUndeadAtkBonus=_sEnemyUndeadAtk;
    if(_sEnemyPermBonus) G.enemyPermanentBonus=_sEnemyPermBonus;
    G.magicLevel=_sMagicLevel;
    window.log=_L; window.renderAll=_R; window.updateHUD=_U; window.renderControls=_RC;
  }
}

// シミュレーション用：allyAttackActionの同期コア（アニメーション・sleep除去）
function _drSimAllySlot(ally,allyIdx){
  if(ally.atk<=0) return;
  const liveE=G.enemies.filter(e=>e&&e.hp>0);
  if(!liveE.length) return;
  if(ally.stealth) ally.stealth=false;
  // 攻撃時効果
  if(ally.hp>0){
    if(ally.effect==='elf_attack'||ally.effect==='elf_shield'){ ally.atk+=1; ally.baseAtk+=1; }
    if(ally.effect==='brownie_attack'){
      const _tb=(G.hasGoldenDrop?1:0)+(G._grimalkinBonus||0); const _thp=1+(G.hasGoldenDrop?1:0)+(G._grimalkinBonus||0);
      G.allies.forEach(a=>{ if(a&&a.hp>0){ if(_tb>0){a.atk+=_tb;a.baseAtk=(a.baseAtk||0)+_tb;} a.hp+=_thp; a.maxHp+=_thp; }});
    }
    if(ally.effect==='forniot'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=1; a.baseAtk=(a.baseAtk||0)+1; }});
    }
  }
  const target=getAttackTarget(ally,G.enemies);
  if(!target) return;
  const isGlobal=ally.keywords&&ally.keywords.includes('全体攻撃');
  const atkTargets=isGlobal?[...liveE]:[target];
  atkTargets.forEach(t=>{
    dealDmgToEnemy(t,ally.atk,G.enemies.indexOf(t),ally);
    // 反撃キーワード：さらに追加ダメージ（生き残った場合のみ）
    if(t.hp>0&&t.keywords&&t.keywords.includes('反撃')&&ally.hp>0){
      dealDmgToAlly(ally,t.atk,allyIdx,t);
    }
  });
  if(ally.hp>0&&!isGlobal){
    const extra=ally.keywords&&ally.keywords.includes('三段攻撃')?2:ally.keywords&&ally.keywords.includes('二段攻撃')?1:0;
    let cur=target;
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ cur=getAttackTarget(ally,G.enemies); if(!cur) break; }
      dealDmgToEnemy(cur,ally.atk,G.enemies.indexOf(cur),ally);
    }
  }
}

// シミュレーション用：enemyAttackActionの同期コア（アニメーション・sleep除去）
function _drSimEnemySlot(enemy,_enemyIdx){
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;
  const primaryTarget=getAttackTarget(enemy,G.allies);
  if(!primaryTarget) return;
  const targets=[primaryTarget];
  const atkVal=enemy.sealed>0?0:enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;
  // 攻撃時効果
  if(atkVal>0&&enemy.hp>0){
    if(enemy.effect==='forniot'){ G.enemies.forEach(f=>{ if(f&&f.hp>0) f.atk+=1; }); }
    if(enemy.effect==='elf_attack'||enemy.effect==='elf_shield'){ enemy.atk+=1; }
    if(enemy.effect==='brownie_attack'){ G.enemies.forEach(f=>{ if(f&&f.hp>0){ f.hp+=1; f.maxHp+=1; }}); }
  }
  const isGlobal=enemy.keywords&&enemy.keywords.includes('全体攻撃');
  const finalT=isGlobal?G.allies.filter(a=>a&&a.hp>0&&!a.stealth):targets;
  const hitSet=new Set();
  finalT.forEach(tgt=>{
    if(hitSet.has(tgt.id)) return;
    const _passed=dealDmgToAlly(tgt,atkVal,G.allies.indexOf(tgt),enemy);
    hitSet.add(tgt.id);
    if(_passed&&tgt.hp>0) applyKeywordOnHit(enemy,tgt);
  });
  if(!isGlobal&&enemy.hp>0){
    const extra=enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0;
    let cur=finalT[0];
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ cur=getAttackTarget(enemy,G.allies); if(!cur) break; }
      if(!cur||cur.hp<=0) break;
      dealDmgToAlly(cur,atkVal,G.allies.indexOf(cur),enemy);
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
  const liveUnits=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0);
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
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    if(u&&u.hp>0&&isEnemy&&u.lane==='front') slot.classList.add('is-rear'); // 前衛はプレイヤー側へシフト
    // lane='rear' 敵はクラスなし（上部デフォルト位置に留まる）
    if(u&&u.hp>0&&!isEnemy&&u.hate&&u.hateTurns>0) slot.classList.add('is-front');
    if(u&&u.hp>0){
      // ライブユニットは常にユニットとして描画する（moveMask は死亡スロットにのみ表示）
      {
        // ── ステータスバッジ（右上固定：状態異常のみ）──
        const bs=[];
        const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';};
        // 標的バッジは非表示（is-front の視覚的シフトで代用）
        if(u.guardian) bs.push('<span class="slot-badge b-guard">守護</span>');
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
        if(u.sealed>0) bs.push('<span class="slot-badge b-seal">封印</span>');
        if(u.instadead) bs.push('<span class="slot-badge b-dead">即死</span>');
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${u.poison}</span>`);
        if(u.doomed>0) bs.push(`<span class="slot-badge b-dead" data-kwdesc="破滅が10になると死亡する。">破滅${u.doomed}</span>`);
        if(u.regen) bs.push(`<span class="slot-badge b-regen">再生${u.regen}</span>`);
        if(u.stealth) bs.push('<span class="slot-badge b-stealth">隠密</span>');
        if(u.allyTarget) bs.push('<span class="slot-badge b-hate">狙われ</span>');
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        // ── キーワードブロック（パワー/ライフとテキストの中間・中央揃え）──
        // 反撃はキーワード欄に表示。エリート/ボスは他キーワードの1行上。
        const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090','アーティファクト':'#b0a080'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
        const _allKws=[...new Set([...(u.keywords||[]),...(u.counter?['反撃']:[])])];
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:1px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
        const gradeTag=u.grade?`<div class="slot-grade">${gradeStr(u.grade)}</div>`:'';
        const _rawDesc=u.desc?computeDesc(u):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
        const raceTag=u.race&&u.race!=='-'?`<div class="slot-race">${u.race}</div>`:'';
        const _probPct=deathProb.get(i);
        const _zone=_probPct==null?null:_probPct>=100?{cls:'will-die',label:'💀',color:'#ff6060'}:_probPct<=20?{cls:'will-warn-low',label:'死亡確率・小',color:'#f0d000'}:_probPct<=79?{cls:'will-warn-mid',label:'死亡確率・中',color:'#f09000'}:{cls:'will-warn-high',label:'死亡確率・大',color:'#e04800'};
        const _probTag=_zone!=null?`<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:.52rem;font-weight:700;z-index:3;white-space:nowrap;pointer-events:none;color:${_zone.color}">${_zone.label}</div>`:'';
        // 情報ブロック：絶対配置でカード全体に広げ中央固定
        // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
        const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
        const _btmStyle='position:absolute;bottom:6px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0;z-index:1;pointer-events:auto';
        slot.style.borderTop='2px solid var(--teal2)';
        if(isEnemy){
          slot.innerHTML=`${badgeBlock}${gradeTag}${_probTag}<div style="${_infoStyle}">${_topRow}<div style="font-size:1.1rem">${u.icon}</div><div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        } else {
          const dragonetSub=u.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(u._dragonetBonus||0))-(u._dragonetCount||0)}戦</div>`:'';
          slot.innerHTML=`${badgeBlock}${gradeTag}${_probTag}<div style="${_infoStyle}">${_topRow}<div style="font-size:1.1rem">${u.icon}</div><div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div>`;
        }
        // 優先ターゲットグループは赤枠
        if(prioritySet.has(i)) slot.classList.add('priority-target');
        // 死亡予測：確実（全試行）→ 赤斜線、可能性あり（一部試行）→ 黄斜線
        if(deathRisk.has(i)) slot.classList.add('will-die');
        else if(warnRisk.has(i)) slot.classList.add('will-warn-'+warnRisk.get(i));
      }
    } else if(isEnemy&&G.visibleMoves.includes(i)&&G.moveMasks[i]&&(!u||u.hp<=0)&&(!_lane||(G.enemies[i]?.lane||'front')===_lane)){
      const _mvType=G.moveMasks[i];
      const nt=NODE_TYPES[_mvType];
      slot.classList.add('has-move');
      slot.innerHTML=`<div class="move-icon">${nt.icon}</div><div class="move-lbl">${nt.label}</div>${nt.desc?`<div class="move-desc">${nt.desc}</div>`:''}` ;
      if(_mvType!=='chest'){
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
  const H=G.handSlots||5;
  const Hcols=10-(G.ringSlots||2); // 常に合計10スロット幅
  el.style.gridTemplateColumns=`repeat(${Hcols},1fr)`;
  const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s).length;
  const hm=document.getElementById('hand-max');   if(hm) hm.textContent=H;

  for(let i=0;i<Hcols;i++){
    if(i>=H){
      // 未解放スロット：極めて薄い表示
      const ph=document.createElement('div');
      ph.className='card-empty spell'; ph.style.opacity='0.1';
      el.appendChild(ph);
      continue;
    }
    const sp=G.spells[i];
    if(sp){
      const div=mkCardEl(sp,i,'spell-battle');
      const isWand=sp.type==='wand';
      const hasCharge=sp.usesLeft===undefined||sp.usesLeft>0;
      const inReward=G.phase==='reward';
      const canUse=(G.phase==='player'||inReward)&&(isWand?(inReward?hasCharge:G.actionsLeft>0&&hasCharge):(inReward||G.actionsLeft>0));
      if(canUse){ div.classList.remove('inert'); div.onclick=()=>useSpell(i); }
      else       { div.classList.add('inert'); }
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
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
    const summonAtkBonus=gmBonus+grimBonus; // ATK：黄金の雫＋ペリュトン
    const summonHpBonus=gmBonus;            // HP：黄金の雫のみ（ペリュトンはATKのみ）
    if(summonAtkBonus>0||summonHpBonus>0){
      // 「数字/数字、」パターンのみを対象にする（±0/+1 や +X/+X などは絶対に対象外）
      desc=desc.replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>{
        return `<span style="color:var(--gold2);font-weight:700">${parseInt(a)+summonAtkBonus}/${parseInt(h)+summonHpBonus}</span>、`;
      });
    }
  }
  if(gmBonus>0){
    // X は杖のみ魔術レベルで置換（それ以外はXのまま）
    if(card.type==='wand') desc=desc.replace(/X/g,`<span style="color:var(--gold2);font-weight:700">${ml}</span>`);
    // 黄金の雫：残りの全ての数字に gmBonus を加算
    // 除外：①（）内の数値（上限説明）・G1/G2等グレード記号・span化済み
    desc=desc.replace(/（[^）]*）|G\d+|<span[^>]*>[\s\S]*?<\/span>|\d+/g,m=>{
      if(m.startsWith('（')||/^G\d+$/.test(m)||m.startsWith('<span')) return m;
      return `<span style="color:var(--gold2);font-weight:700">${parseInt(m)+gmBonus}</span>`;
    });
  } else {
    if(card.type==='wand') desc=desc.replace(/X/g,`<span style="color:#6dd;font-weight:700">${ml}</span>`);
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
  return desc;
}

function mkCardEl(card,_idx,_ctx,_mlOverride){
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム'};
  const div=document.createElement('div');
  const t=card.type||'ring';
  div.className=`card ${t}${card.legend?' legend-card':''}`;
  const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
  const tpLabel=typeLabel[t]||'指輪';
  const kindLabel='';
  // グレード（左・絶対配置）・価格バッジ（右・絶対配置）
  // 杖・消耗品は grade 未設定なので _rarity → rarity → 1 の順にフォールバック
  const _gradeNum=card.grade||(card._rarity)||((card.rarity>0)?card.rarity:null)||((card.type==='wand'||card.type==='consumable')?1:0);
  const gradeEl=_gradeNum?`<span class="card-grade${card.legend?' legend-grade':''}">${gradeStr(_gradeNum)}</span>`:'';
  const badgeEl=(card._buyPrice!=null&&G.phase==='reward')?`<span class="card-badge">${_circleCost(card._buyPrice)}</span>`:'';
  // 杖のチャージ表示（テキスト下）
  const charges=card.type==='wand'
    ?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?'))
    :null;
  const chargeLabel=charges!==null?`<div class="card-charge">チャージ：${charges}</div>`:'';
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
  div.innerHTML=`${gradeEl}${badgeEl}<div class="card-tp ${t}">${tpLabel}${kindLabel}</div><div class="card-name">${card.name}</div><div class="card-desc">${dynDesc}</div>${enc}${chargeLabel}${atkLabel}${hpLabel}`;
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
  const isReward=G.phase==='reward';
  const hasEnemyItems=(G.bossRings&&G.bossRings.some(r=>r))||(G.bossHand&&G.bossHand.some(s=>s));
  if(!hasEnemyItems&&!isReward){ area.style.display='none'; return; }
  area.style.display='';

  // 動的取得モード：指輪非表示・インベントリ3枠
  const isDynamic=!isReward&&(G._enemyHandDynamic||false);

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
  const _pHcols=10-(G.ringSlots||2);
  const eHcols=isReward?_pHcols:isDynamic?3:8;
  const activeHand=isReward?5:eHcols;
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
        const cost=sp._buyPrice??2;
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
