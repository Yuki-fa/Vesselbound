// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// ── キーワードツールチップ（KW_DESC_MAP は loader.js で effect_id シートから読み込み）──

(function _initKwTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  document.addEventListener('mouseover',e=>{
    const el=e.target.closest('.slot-badge[data-kwdesc]');
    if(!el){ tip.style.display='none'; return; }
    const desc=el.getAttribute('data-kwdesc');
    if(!desc){ tip.style.display='none'; return; }
    tip.textContent=desc;
    tip.style.display='block';
    _posKwTip(tip,e);
  });
  document.addEventListener('mousemove',e=>{
    if(tip.style.display==='none') return;
    if(!e.target.closest('.slot-badge[data-kwdesc]')){ tip.style.display='none'; return; }
    _posKwTip(tip,e);
  });
  document.addEventListener('mouseout',e=>{
    if(!e.relatedTarget||!e.relatedTarget.closest('.slot-badge[data-kwdesc]')) tip.style.display='none';
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

function renderAll(){
  renderField('f-enemy',G.enemies,true);
  renderField('f-ally',G.allies,false);
  renderHand();
  renderControls();
  renderArcanaBar();
  renderCommanderWands();
  updateHUD();
  requestAnimationFrame(fitCardDescs);
}

// 戦闘フェイズ1ターン分（インターリーブ）をシミュレーションし、死亡する味方インデックスを返す
// 実際のbattle.jsの関数（dealDmgToAlly/dealDmgToEnemy等）をclone上で実行することで
// キーワード効果・シールド・反撃など全ての処理を自動的に反映する
function _computeDeathRisk(){
  if(G.phase!=='player') return new Set();
  if(!G.allies.some(a=>a&&a.hp>0)||!G.enemies.some(e=>e&&e.hp>0)) return new Set();

  // ── 状態を退避 ──
  const _sA=G.allies, _sE=G.enemies;
  const _sGold=G.gold, _sEarned=G.earnedGold;
  const _sBC=G.battleCounters, _sPT=G._pendingTreasure, _sEK=G._eliteKilled;
  const _sVM=G.visibleMoves, _sMM=G.moveMasks;
  const _sPhase=G.phase;
  // ログ・描画関数を無効化
  const _L=window.log,_R=window.renderAll,_U=window.updateHUD,_RC=window.renderControls;
  window.log=()=>{}; window.renderAll=()=>{}; window.updateHUD=()=>{}; window.renderControls=()=>{};

  try{
    // ── Gにcloneを差し込む ──
    G.allies=G.allies.map(a=>a?JSON.parse(JSON.stringify(a)):null);
    G.enemies=G.enemies.map(e=>e?JSON.parse(JSON.stringify(e)):null);
    G.battleCounters={damage:0,deaths:0};
    G.visibleMoves=[...(_sVM||[])];
    G.moveMasks=[...(_sMM||[])];
    G._pendingTreasure=_sPT;

    // ── インターリーブ攻撃シミュレーション（allyAttackAction/enemyAttackActionの同期版）──
    for(let i=0;i<6;i++){
      const ally=G.allies[i];
      if(ally&&ally.hp>0&&!ally._isSoul) _drSimAllySlot(ally,i);
      if(!G.enemies.some(e=>e&&e.hp>0)) break;
      const enemy=G.enemies[i];
      if(enemy&&enemy.hp>0) _drSimEnemySlot(enemy,i);
      if(!G.allies.some(a=>a&&a.hp>0)) break;
    }

    // ── 死亡した味方インデックスを収集 ──
    const result=new Set();
    G.allies.forEach((a,i)=>{ if(a&&a.hp<=0) result.add(i); });
    return result;

  } finally {
    // ── 状態を完全復元 ──
    G.allies=_sA; G.enemies=_sE;
    G.gold=_sGold; G.earnedGold=_sEarned;
    G.battleCounters=_sBC; G._pendingTreasure=_sPT; G._eliteKilled=_sEK;
    G.visibleMoves=_sVM; G.moveMasks=_sMM;
    G.phase=_sPhase;
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
      const _db=_dryadBonus(); const _tb=(G.hasGoldenDrop?1:0)+(G._grimalkinBonus||0)+_db; const _thp=1+(G.hasGoldenDrop?1:0)+(G._grimalkinBonus||0)+_db;
      G.allies.forEach(a=>{ if(a&&a.hp>0){ if(_tb>0){a.atk+=_tb;a.baseAtk=(a.baseAtk||0)+_tb;} a.hp+=_thp; a.maxHp+=_thp; }});
    }
    if(ally.effect==='forniot'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=1; a.baseAtk=(a.baseAtk||0)+1; }});
    }
  }
  const forcedT=liveE.find(e=>e.allyTarget);
  const target=forcedT||liveE[liveE.length-1];
  const isGlobal=ally.keywords&&ally.keywords.includes('全体攻撃');
  const atkTargets=isGlobal?[...liveE]:[target];
  atkTargets.forEach(t=>{
    dealDmgToEnemy(t,ally.atk,G.enemies.indexOf(t),ally);
    if(t.hp>0&&t.keywords&&t.keywords.includes('反撃')&&ally.hp>0)
      dealDmgToAlly(ally,t.atk,allyIdx,t);
  });
  if(ally.hp>0&&!isGlobal){
    const extra=ally.keywords&&ally.keywords.includes('三段攻撃')?2:ally.keywords&&ally.keywords.includes('二段攻撃')?1:0;
    let cur=target;
    for(let h=0;h<extra;h++){
      if(!cur||cur.hp<=0){ const _nl=G.enemies.filter(e=>e&&e.hp>0); if(!_nl.length) break; cur=_nl.find(e=>e.allyTarget)||_nl[_nl.length-1]; }
      dealDmgToEnemy(cur,ally.atk,G.enemies.indexOf(cur),ally);
    }
  }
}

// シミュレーション用：enemyAttackActionの同期コア（アニメーション・sleep除去）
function _drSimEnemySlot(enemy,_enemyIdx){
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;
  const hateTgts=liveA.filter(a=>a.hate&&a.hateTurns>0&&!a.stealth);
  const visibleA=liveA.filter(a=>!a.stealth);
  const cands=visibleA.length?visibleA:liveA;
  const targets=hateTgts.length>0?hateTgts:[cands[cands.length-1]];
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
      if(!cur||cur.hp<=0){ const _nl=G.allies.filter(a=>a&&a.hp>0&&!a.stealth); if(!_nl.length) break; const _nh=_nl.filter(a=>a.hate&&a.hateTurns>0); cur=_nh.length?_nh[_nh.length-1]:_nl[_nl.length-1]; }
      if(!cur||cur.hp<=0) break;
      dealDmgToAlly(cur,atkVal,G.allies.indexOf(cur),enemy);
    }
  }
  G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });
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
      const esc=kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re=new RegExp('^'+esc+'[\\s\u3000。、]*');
      const next=result.replace(re,'').trimStart();
      if(next!==result){ result=next; changed=true; break; }
    }
  }
  return result.trim();
}

function renderField(id,units,isEnemy){
  const el=document.getElementById(id);
  el.innerHTML='';
  const deathRisk=(!isEnemy)?_computeDeathRisk():new Set();
  // 優先ターゲットのインデックスを特定
  const liveUnits=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0);
  let priorityIdx=-1;
  if(isEnemy){
    const forced=liveUnits.find(x=>x.u.allyTarget);
    priorityIdx=forced?forced.i:(liveUnits.length?liveUnits[liveUnits.length-1].i:-1);
  } else {
    const hate=liveUnits.find(x=>x.u.hate&&x.u.hateTurns>0);
    priorityIdx=hate?hate.i:(liveUnits.length?liveUnits[liveUnits.length-1].i:-1);
  }
  for(let i=0;i<6;i++){
    const u=units[i];
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    if(u&&u.hp>0){
      const mv=isEnemy&&G.visibleMoves.includes(i)?G.moveMasks[i]:null;
      if(mv){
        slot.classList.add('has-move');
        const nt=NODE_TYPES[mv];
        slot.innerHTML=`<div class="move-icon">${nt.icon}</div><div class="move-lbl">${nt.label}</div>`;
      } else {
        // ── ステータスバッジ（右上固定：状態異常のみ）──
        const bs=[];
        const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';};
        if(u.hate) bs.push(`<span class="slot-badge b-hate"${_sd('ヘイト')}>ヘイト</span>`);
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
        const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','ヘイト':'#60c0c0','成長':'#60d090'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
        const _allKws=[...(u.keywords||[]),...(u.counter?['反撃']:[])];
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:2px">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_topKws.length||_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_topRow}${_normRow}</div>`;
        const gradeTag=u.grade?`<div style="position:absolute;top:2px;left:2px;font-size:.48rem;color:var(--gold);font-weight:700">${gradeStr(u.grade)}</div>`:'';
        const _rawDesc=u.desc?computeDesc(u):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
        const raceTag=u.race&&u.race!=='-'?`<div style="font-size:.44rem;color:var(--text2);line-height:1">${u.race}</div>`:'';
        // 情報ブロック：絶対配置でカード全体に広げ中央固定
        // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
        const _infoStyle='position:absolute;inset:0 0 3px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px';
        const _btmStyle='position:absolute;bottom:3px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:center;padding:0 2px 2px';
        if(isEnemy){
          slot.innerHTML=`${badgeBlock}${gradeTag}<div style="${_infoStyle}"><div style="font-size:1rem">${u.icon}</div><div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div><div class="slot-hpbar"><div class="slot-hpfill" style="width:${Math.max(0,u.hp/u.maxHp*100)}%"></div></div>`;
        } else {
          const dragonetSub=u.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(u._dragonetBonus||0))-(u._dragonetCount||0)}戦</div>`:'';
          slot.innerHTML=`${badgeBlock}${gradeTag}<div style="${_infoStyle}"><div style="font-size:1.1rem">${u.icon}</div><div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div><div class="slot-hpbar"><div class="slot-hpfill" style="width:${Math.max(0,u.hp/u.maxHp*100)}%"></div></div>`;
        }
        // 優先ターゲットは赤枠
        if(i===priorityIdx) slot.classList.add('priority-target');
        // 確実に死亡する味方：赤斜線を点滅表示
        if(!isEnemy&&deathRisk.has(i)) slot.classList.add('will-die');
      }
    } else if(isEnemy&&G.visibleMoves.includes(i)&&G.moveMasks[i]&&(!u||u.hp<=0)){
      const nt=NODE_TYPES[G.moveMasks[i]];
      slot.classList.add('has-move');
      slot.innerHTML=`<div class="move-icon">${nt.icon}</div><div class="move-lbl">${nt.label}</div>`;
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

function renderRingSlots(){
  const el=document.getElementById('ring-slots');
  if(!el) return;
  // 旧row2は非表示
  const extraRow=document.getElementById('ring-extra-row');
  if(extraRow) extraRow.style.display='none';
  el.innerHTML='';
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=G.rings.filter(r=>r).length;
  const rm=document.getElementById('ring-max');   if(rm) rm.textContent=G.ringSlots;

  for(let i=0;i<G.ringSlots;i++){
    const ring=G.rings[i];
    if(ring){
      const div=mkCardEl(ring,i,'ring-battle');
      div.classList.add('inert');
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty';
      el.appendChild(ph);
    }
  }
}

// 手札スロット（杖＋消耗品の混合 7 枠）
function renderHandSlots(){
  const el=document.getElementById('hand-slots');
  if(!el) return;
  el.innerHTML='';
  const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s).length;
  const hm=document.getElementById('hand-max');   if(hm) hm.textContent=G.handSlots||5;

  for(let i=0;i<(G.handSlots||5);i++){
    const sp=G.spells[i];
    if(sp){
      const div=mkCardEl(sp,i,'spell-battle');
      const isWand=sp.type==='wand';
      const hasCharge=sp.usesLeft===undefined||sp.usesLeft>0;
      // 杖はアクション消費、消耗品はアクション消費なし（両方プレイヤーフェイズに使用可）
      const canUse=G.phase==='player'&&(isWand?G.actionsLeft>0&&hasCharge:true);
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
function gradeStr(g){ return (g>=MAX_GRADE)?'★':('G'+g); }
// legend指輪のグレード表示（★固定）
function cardGradeStr(card){ return card.legend?'★':gradeStr(card.grade||1); }

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

function computeDesc(card){
  if(card.isEnchant) return '契約に「'+card.enchantType+'」を付与する';
  const g=card.grade||1;
  const rawMl=typeof G!=='undefined'?G.magicLevel||1:1;
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
    const summonBonus=gmBonus+grimBonus;
    if(summonBonus>0){
      // 「数字/数字、」パターンのみを対象にする（±0/+1 や +X/+X などは絶対に対象外）
      desc=desc.replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>{
        return `<span style="color:var(--gold2);font-weight:700">${parseInt(a)+summonBonus}/${parseInt(h)+summonBonus}、</span>`;
      });
    }
  }
  if(gmBonus>0){
    // X は杖のみ魔術レベルで置換（それ以外はXのまま）
    if(card.type==='wand') desc=desc.replace(/X/g,`<span style="color:var(--gold2);font-weight:700">${ml}</span>`);
    // 黄金の雫：残りの全ての数字に gmBonus を加算（span化済みはスキップ）
    desc=desc.replace(/(<span[^>]*>[\s\S]*?<\/span>)|(\d+)/g,(_m,spanned,num)=>{
      if(spanned) return spanned;
      return `<span style="color:var(--gold2);font-weight:700">${parseInt(num)+gmBonus}</span>`;
    });
  } else {
    if(card.type==='wand') desc=desc.replace(/X/g,`<span style="color:#6dd;font-weight:700">${ml}</span>`);
  }
  // タイミングキーワードを太字化（「開戦：」「終戦：」等）
  desc=desc.replace(/(開戦|終戦|負傷|誘発|攻撃|召喚|常在)：/g,'<strong>$1</strong>：');
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
  if(card.type==='wand'){
    const uses=card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?');
    desc+=' (残'+uses+'回）';
  }
  return desc;
}

function mkCardEl(card,_idx,_ctx){
  const typeLabel={ring:'契約',wand:'杖',consumable:'アイテム'};
  const div=document.createElement('div');
  const t=card.type||'ring';
  div.className=`card ${t}${card.legend?' legend-card':''}`;
  const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
  const tpLabel=card.kind==='summon'?'契約（召喚）':card.kind==='passive'?'契約（補助）':(typeLabel[t]||'契約');
  const kindLabel=card.kind==='passive'?'<span style="font-size:.5rem;color:var(--teal2);margin-left:3px">P</span>':'';
  const usesLabel=card.type==='wand'&&card.usesLeft!==undefined?`<span style="font-size:.56rem;color:var(--gold2);position:absolute;bottom:3px;right:4px">×${card.usesLeft}</span>`:'';
  let atkLabel='', hpLabel='';
  if(card.kind==='summon'&&card.summon){
    const es=effectiveStats(card);
    if(es){
      const cs=es.count>1?'×'+es.count:'';
      atkLabel=`<span class="card-summon-atk">${es.atk}${cs}</span>`;
      hpLabel=`<span class="card-summon-hp">${es.hp}</span>`;
    }
  }
  const dynDesc=computeDesc(card);
  div.innerHTML=`<div class="card-tp ${t}">${tpLabel}${kindLabel}</div>${card.grade?`<div class="card-grade${card.legend?' legend-grade':''}">${cardGradeStr(card)}</div>`:''}<div class="card-name">${card.name}</div><div class="card-desc">${dynDesc}</div>${enc}${atkLabel}${hpLabel}${usesLabel}`;
  return div;
}

function renderControls(){
  const badge=document.getElementById('ph-badge');
  const pp=document.getElementById('btn-pass');
  const pr=document.getElementById('btn-retreat');
  if(G.phase==='player'){
    badge.className='ph-badge ph-player'; badge.textContent='プレイヤーターン';
    pp.style.display=''; pp.textContent=G.actionsLeft>0?'パス':'ターン終了';
    pr.style.display=G.visibleMoves.some(i=>G.moveMasks[i]&&G.moveMasks[i]!=='chest')?'':'none';
  } else if(G.phase==='commander'){
    badge.className='ph-badge ph-enemy'; badge.textContent='司令官フェイズ';
    pp.style.display='none'; pr.style.display='none';
  } else {
    badge.className='ph-badge ph-enemy'; badge.textContent='敵のターン';
    pp.style.display='none'; pr.style.display='none';
  }
}

function setHint(t){ document.getElementById('hint-txt').textContent=t; }

function renderCommanderWands(){
  const bar=document.getElementById('commander-wands-bar');
  if(!bar) return;
  const wands=G.commanderWands||[];
  if(!wands.length){ bar.style.display='none'; return; }
  bar.style.display='';
  bar.innerHTML='<span style="opacity:.6;font-size:.58rem;margin-right:4px">敵の杖：</span>'
    +wands.map(w=>`<span style="background:rgba(80,120,200,.18);border:1px solid rgba(80,120,200,.35);border-radius:3px;padding:1px 6px;font-size:.6rem;margin-right:3px;color:var(--blue2)">${w.name}</span>`).join('');
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
