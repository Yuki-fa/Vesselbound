// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

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

// 次の敵フェイズで確実に死亡する味方インデックスのセットを計算
function _computeDeathRisk(){
  if(G.phase!=='player') return new Set();
  const liveAllies=G.allies.map((a,i)=>a&&a.hp>0?{a,i}:null).filter(Boolean);
  const liveEnemies=G.enemies.map((e,i)=>e&&e.hp>0&&!e.sealed&&!e.nullified?{e,i}:null).filter(Boolean);
  if(!liveAllies.length||!liveEnemies.length) return new Set();

  // 味方の合計ATKで敵を全滅できるなら、敵フェイズは発生しない
  const totalAllyAtk=liveAllies.reduce((s,{a})=>s+(a.atk||0),0);
  const totalEnemyHp=liveEnemies.reduce((s,{e})=>s+(e.hp||0),0);
  if(totalAllyAtk>=totalEnemyHp) return new Set();

  // 敵が攻撃してくる場合のみ（ATK>0の敵）
  const attackingEnemies=liveEnemies.filter(({e})=>e.atk>0);
  if(!attackingEnemies.length) return new Set();

  const dmgMap={};
  liveAllies.forEach(({i})=>{ dmgMap[i]=[]; });
  attackingEnemies.forEach(({e})=>{
    const hateA=liveAllies.find(x=>x.a.hate&&x.a.hateTurns>0);
    const tgt=hateA||liveAllies[liveAllies.length-1];
    dmgMap[tgt.i].push(e.atk);
  });
  const result=new Set();
  liveAllies.forEach(({a,i})=>{
    const atks=dmgMap[i]; if(!atks||!atks.length) return;
    let shield=a.shield||0, totalDmg=0;
    for(const atk of atks){ if(atk>0&&shield>0) shield--; else totalDmg+=atk; }
    if(totalDmg>0&&totalDmg>=a.hp) result.add(i);
  });
  return result;
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
        const bs=[];
        if(u.hate) bs.push('<span class="slot-badge b-hate">ヘイト</span>');
        if(u.guardian) bs.push('<span class="slot-badge b-guard">守護</span>');
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield">🛡${u.shield}</span>`);
        if(u.sealed>0) bs.push('<span class="slot-badge b-seal">封印</span>');
        if(u.instadead) bs.push('<span class="slot-badge b-dead">即死</span>');
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn">毒${u.poison}</span>`);
        if(u.regen) bs.push(`<span class="slot-badge b-regen">再生${u.regen}</span>`);
        if(u.stealth) bs.push('<span class="slot-badge b-stealth">隠密</span>');
        if(u.counter) bs.push('<span class="slot-badge b-counter">反撃</span>');
        if(u.allyTarget) bs.push('<span class="slot-badge b-hate">狙われ</span>');
        // キーワードバッジ（敵味方共通）
        if(u.keywords&&u.keywords.length){
          const kColorMap={'即死':'#e060e0','毒':'#a060d0','パワーブレイク':'#e08060','範囲攻撃':'#e04040','加護':'#60b0e0','リーダー':'#f0d080','エリート':'#ffd700','二段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','貫通':'#a0d060','絆':'#d080d0'};
          u.keywords.forEach(k=>{
            const kColor=kColorMap[k]||'#888';
            const kLabel=k==='パワーブレイク'?`パワーブレイク${G.floor||1}`:k;
            bs.push(`<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kColor};border:1px solid ${kColor}">${kLabel}</span>`);
          });
        }
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        const gradeTag=u.grade?`<div style="position:absolute;top:2px;left:2px;font-size:.48rem;color:var(--gold);font-weight:700">${gradeStr(u.grade)}</div>`:'';
        const descTag=u.desc?`<div class="slot-desc">${u.desc}</div>`:'';
        if(isEnemy){
          slot.innerHTML=`${badgeBlock}${gradeTag}<div style="font-size:1rem">${u.icon}</div><div class="slot-name">${u.name}</div><div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div><div class="slot-hpbar"><div class="slot-hpfill" style="width:${Math.max(0,u.hp/u.maxHp*100)}%"></div></div>`;
        } else {
          slot.style.justifyContent='flex-start';
          slot.style.padding='0 2px 8px';
          const dragonetSub=u.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${3-(u._battleCount||0)}戦</div>`:'';
          slot.innerHTML=`${badgeBlock}${gradeTag}<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px"><div style="font-size:1.1rem">${u.icon}</div>${dragonetSub}<div class="slot-name">${u.name}</div><div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div></div><div class="slot-hpbar"><div class="slot-hpfill" style="width:${Math.max(0,u.hp/u.maxHp*100)}%"></div></div>${descTag}`;
        }
        // 優先ターゲットは赤枠＋前に出す
        if(i===priorityIdx){
          slot.classList.add('priority-target');
          slot.style.transform=isEnemy?'translateY(4px)':'translateY(-4px)';
        }
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
  const hm=document.getElementById('hand-max');   if(hm) hm.textContent=G.handSlots||7;

  for(let i=0;i<(G.handSlots||7);i++){
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
  // ザ・グレートマザー：味方キャラクターカードの効果テキスト数値を全て+grade（指輪・杖・アイテムは対象外）
  const gmRing=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.unique==='great_mother'):null;
  const isCharCard=!card.type&&!card.kind; // キャラクター判定（type/kindなし）
  const gmBonus=gmRing&&card.id!==gmRing.id&&isCharCard?(gmRing.grade||1):0;
  const ml=rawMl+gmBonus;
  let desc=_evalMath((card.desc||'').replace(/Grade/g,String(g)));
  if(gmBonus>0){
    desc=desc
      .replace(/X/g,`<span style="color:var(--gold2);font-weight:700">${ml}</span>`)
      .replace(/(\d+)/g,n=>`<span style="color:var(--gold2);font-weight:700">${parseInt(n)+gmBonus}</span>`);
  } else {
    desc=desc.replace(/X/g,`<span style="color:#6dd;font-weight:700">${ml}</span>`);
  }
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

function mkCardEl(card,idx,ctx){
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
    pr.style.display=G.visibleMoves.some(i=>G.moveMasks[i])?'':'none';
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
