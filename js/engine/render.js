// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// ── キーワードツールチップ ──
const _KW_DESC={
  '即死':      '攻撃がヒットしたキャラクターを即座に死亡させる。',
  '毒':        '毎ターン開始時にX点のダメージを与える。',
  '加護':      '魔法の効果を受けない（消耗品・杖の対象にならない）。',
  '貫通':      'シールドを無視してダメージを与える。',
  '二段攻撃':  '1回の攻撃で同じ対象に2回ダメージを与える。',
  '三段攻撃':  '1回の攻撃で同じ対象に3回ダメージを与える。',
  '全体攻撃':  '攻撃が全ての味方ユニットに同時に当たる。',
  '反撃':      '攻撃を受けて生き残った時、攻撃してきた相手に反撃を行う。',
  '再生':      '戦闘終了時にXライフを回復する（最大ライフも増加）。',
  '絆':        '同じ種族の仲間が多いほど強くなる。',
  '魂喰らい':  'キャラクターを倒すと自身のパワー／ライフが増加する。',
  '結束':      '味方の数が敵より多い時に強化される。',
  '邪眼':      'ターン開始時、対象の敵に即死デバフを付与する。',
  '呪詛':      'このユニットを攻撃した相手のパワーを永続的に減少させる。',
  '狩人':      '戦闘開始時、最も弱い敵を即座に仕留める。',
  'ヘイト':    '敵が攻撃対象を選ぶ際、優先的に狙われる。',
  '守護':      '後ろの味方の代わりにダメージを引き受ける。',
  'エリート':  'エリート敵。倒すと追加報酬が得られる。',
  'ボス':      'ボス敵。非常に強力で、特殊な報酬を持つ。',
};

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

// 次の敵フェイズで確実に死亡する味方インデックスのセットを計算
function _computeDeathRisk(){
  if(G.phase!=='player') return new Set();
  const liveAllies=G.allies.map((a,i)=>a&&a.hp>0?{a,i}:null).filter(Boolean);
  const liveEnemies=G.enemies.map((e,i)=>e&&e.hp>0&&!e.sealed&&!e.nullified?{e,i}:null).filter(Boolean);
  if(!liveAllies.length||!liveEnemies.length) return new Set();

  // 味方攻撃フェーズをシミュレーション（最適戦略：倒せる中で最もHPが低い敵から撃破）
  const simHp=liveEnemies.map(({e,i})=>({idx:i, hp:e.hp, atk:e.atk, keywords:e.keywords||[], instadead:e.instadead||false, injury:e.injury||null}));
  // injury効果で召喚された追加敵（freyr=ロイヤルガード4/6、kettcat=ナイトキャット2/4、ran=海の眷属7/dmg）
  const _injurySpawned=[];
  for(const {a} of liveAllies){
    let best=null;
    for(const s of simHp){
      if(s.hp<=0) continue;
      if(s.hp<=(a.atk||0)&&(!best||s.hp<best.hp)) best=s;
    }
    if(best){
      // 止めを刺す→死亡なので負傷効果は発動しない
      best.hp=0;
    } else {
      let min=null;
      for(const s of simHp){ if(s.hp>0&&(!min||s.hp<min.hp)) min=s; }
      if(min){
        const newHp=Math.max(0,min.hp-(a.atk||0));
        // 生き残る場合のみ負傷効果を発動
        if(newHp>0){
          if(min.injury==='freyr')        _injurySpawned.push({hp:6,atk:4,keywords:[],instadead:false});
          else if(min.injury==='kettcat') _injurySpawned.push({hp:4,atk:2,keywords:[],instadead:false});
          else if(min.injury==='ran')     _injurySpawned.push({hp:Math.max(1,a.atk||1),atk:7,keywords:[],instadead:false});
        }
        min.hp=newHp;
      }
    }
  }

  // 生き残り敵による逐次攻撃シミュレーション（連鎖ターゲット・AoE対応）
  const survivors=[...simHp.filter(s=>s.hp>0&&s.atk>0),..._injurySpawned.filter(s=>s.atk>0)];
  if(!survivors.length) return new Set();

  const allyState=liveAllies.map(({a,i})=>({i, hp:a.hp, shield:a.shield||0, hate:a.hate&&a.hateTurns>0, instadead:a.instadead||false, dead:false}));
  const result=new Set();
  for(const s of survivors){
    const alive=allyState.filter(a=>!a.dead);
    if(!alive.length) break;
    const isAoe=s.keywords.includes('全体攻撃');
    const targets=isAoe?alive:[alive.find(x=>x.hate)||alive[alive.length-1]];
    // 攻撃回数（三段攻撃=3、二段攻撃=2、それ以外=1）
    const hits=s.keywords.includes('三段攻撃')?3:s.keywords.includes('二段攻撃')?2:1;
    const isInstakill=s.keywords.includes('即死');
    for(const tgt of targets){
      for(let h=0;h<hits;h++){
        if(tgt.dead) break;
        if(tgt.shield>0){ tgt.shield--; }
        else if(isInstakill||tgt.instadead){ tgt.hp=0; tgt.dead=true; result.add(tgt.i); }
        else{ tgt.hp-=s.atk; if(tgt.hp<=0){ tgt.dead=true; result.add(tgt.i); } }
      }
    }
  }
  return result;
}

// キーワードバッジで表示済みの文字列をdesc先頭から除去
function _stripKeywordsFromDesc(desc, unit){
  if(!desc) return desc;
  const patterns=[
    ...(unit.keywords||[]),
    ...(unit.counter?['反撃']:[]),
    '2回攻撃','トリプル','3段攻撃','2段攻撃',
    ...(unit.regen?['再生'+unit.regen,'再生']:[]),
    ...(unit.poison>0?['毒'+unit.poison,'毒']:[]),
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
        if(u.hate) bs.push('<span class="slot-badge b-hate">ヘイト</span>');
        if(u.guardian) bs.push('<span class="slot-badge b-guard">守護</span>');
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield">🛡</span>`);
        if(u.sealed>0) bs.push('<span class="slot-badge b-seal">封印</span>');
        if(u.instadead) bs.push('<span class="slot-badge b-dead">即死</span>');
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn">毒${u.poison}</span>`);
        if(u.regen) bs.push(`<span class="slot-badge b-regen">再生${u.regen}</span>`);
        if(u.stealth) bs.push('<span class="slot-badge b-stealth">隠密</span>');
        if(u.allyTarget) bs.push('<span class="slot-badge b-hate">狙われ</span>');
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        // ── キーワードブロック（パワー/ライフとテキストの中間・中央揃え）──
        // 反撃はキーワード欄に表示。エリート/ボスは他キーワードの1行上。
        const _kColorMap={'即死':'#e060e0','毒':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','貫通':'#a0d060','絆':'#d080d0','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','ヘイト':'#60c0c0','再生':'#60d090'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=_KW_DESC[k]||_KW_DESC[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
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
          const dragonetSub=u.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${3-(u._dragonetCount||0)}戦</div>`:'';
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
  // 黄金の雫・グリマルキン：G.alliesに実在する味方ユニットのみ適用（報酬プール/敵は対象外）
  const gmRing=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.unique==='great_mother'):null;
  const isCharCard=!card.type&&!card.kind; // キャラクター判定（type/kindなし）
  const isAllyUnit=isCharCard&&typeof G!=='undefined'&&G.allies&&G.allies.indexOf(card)>=0;
  const gmBonus=gmRing&&isAllyUnit?(gmRing.grade||1):0;
  // グリマルキン：還魂回数分、味方ユニットの召喚数値に加算
  const grimBonus=isAllyUnit&&typeof G!=='undefined'?(G._grimalkinBonus||0):0;
  const totalBonus=gmBonus+grimBonus;
  const ml=rawMl+gmBonus;
  let desc=_evalMath((card.desc||'').replace(/Grade/g,String(g)));
  if(totalBonus>0){
    desc=desc
      .replace(/X/g,`<span style="color:var(--gold2);font-weight:700">${ml}</span>`)
      .replace(/(\d+)/g,n=>`<span style="color:var(--gold2);font-weight:700">${parseInt(n)+totalBonus}</span>`)
      .replace(/±(<span)/g,'+$1'); // ±0 → +N（0にボーナス加算後は正の数）
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
