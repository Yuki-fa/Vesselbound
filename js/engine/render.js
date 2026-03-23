// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// 指輪の実効ステータスを計算（グレード倍率・エンチャント・バフ込み）
function effectiveStats(ring){
  if(!ring||!ring.summon) return null;
  const grade=ring.grade||1;
  const mult=GRADE_MULT[grade];
  let atk=ring.atkPerGrade!==undefined?ring.summon.atk+ring.atkPerGrade*grade:Math.round(ring.summon.atk*mult);
  let hp =ring.hpPerGrade !==undefined?ring.summon.hp +ring.hpPerGrade *grade:Math.round(ring.summon.hp *mult);
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
}

function renderField(id,units,isEnemy){
  const el=document.getElementById(id);
  el.innerHTML='';
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
        if(u.resurrection&&!u.resurrected) bs.push('<span class="slot-badge b-regen">再生</span>');
        // キーワードバッジ（敵のみ）
        if(isEnemy&&u.keywords&&u.keywords.length){
          u.keywords.forEach(k=>{
            const kColor={'即死':'#e060e0','毒':'#a060d0','パワーブレイク':'#e08060','範囲攻撃':'#e04040','加護':'#60b0e0','リーダー':'#f0d080','エリート':'#ffd700'}[k]||'#888';
            bs.push(`<span style="position:relative;font-size:.48rem;padding:1px 3px;border-radius:2px;background:rgba(0,0,0,.4);color:${kColor};border:1px solid ${kColor};margin-right:1px">${k}</span>`);
          });
        }
        const gradeTag=u.grade?`<div style="position:absolute;top:2px;left:2px;font-size:.48rem;color:var(--gold);font-weight:700">${gradeStr(u.grade)}</div>`:'';
        slot.innerHTML=`${bs.join('')}${gradeTag}<div style="font-size:1rem">${u.icon}</div><div class="slot-name">${u.name}</div><div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="h">${u.hp}</span></div><div class="slot-hpbar"><div class="slot-hpfill" style="width:${Math.max(0,u.hp/u.maxHp*100)}%"></div></div>`;
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
  renderWandSlots();
  renderConsumSlots();
}

function renderRingSlots(){
  const el=document.getElementById('ring-slots');
  const el2=document.getElementById('ring-slots-2');
  const extraRow=document.getElementById('ring-extra-row');
  el.innerHTML='';
  if(el2) el2.innerHTML='';
  document.getElementById('ring-count').textContent=G.rings.filter(r=>r).length;
  const rmEl=document.getElementById('ring-max'); if(rmEl) rmEl.textContent=G.ringSlots;

  // Row 1: always render 5 ring slots (indices 0-4)
  for(let i=0;i<5;i++){
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

  // Row 2: extra ring slots (indices 5+)
  if(el2&&extraRow){
    if(G.ringSlots>5){
      extraRow.style.display='';
      for(let i=5;i<G.ringSlots;i++){
        const ring=G.rings[i];
        if(ring){
          const div=mkCardEl(ring,i,'ring-battle');
          div.classList.add('inert');
          el2.appendChild(div);
        } else {
          const ph=document.createElement('div');
          ph.className='card-empty';
          el2.appendChild(ph);
        }
      }
    } else {
      extraRow.style.display='none';
    }
  }
}

function renderWandSlots(){
  const el=document.getElementById('wand-slots');
  el.innerHTML='';
  document.getElementById('wand-count').textContent=G.spells.slice(0,G.wandSlots).filter(s=>s).length;
  const wmEl=document.getElementById('wand-max'); if(wmEl) wmEl.textContent=G.wandSlots;
  for(let i=0;i<G.wandSlots;i++){
    const sp=G.spells[i];
    if(sp){
      const div=mkCardEl(sp,i,'spell-battle');
      const hasCharge=sp.usesLeft===undefined||sp.usesLeft>0;
      if(G.phase==='player'&&G.actionsLeft>0&&hasCharge){
        div.classList.remove('inert');
        div.onclick=()=>useSpell(i);
      } else {
        div.classList.add('inert');
      }
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      el.appendChild(ph);
    }
  }
}

function renderConsumSlots(){
  const el=document.getElementById('consum-slots');
  el.innerHTML='';
  document.getElementById('consum-count').textContent=G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length;
  const cmEl=document.getElementById('consum-max'); if(cmEl) cmEl.textContent=G.consumSlots;
  for(let i=G.wandSlots;i<G.wandSlots+G.consumSlots;i++){
    const sp=G.spells[i];
    if(sp){
      const div=mkCardEl(sp,i,'spell-battle');
      if(G.phase==='player'&&G.actionsLeft>0){
        div.classList.remove('inert');
        div.onclick=()=>useSpell(i);
      } else {
        div.classList.add('inert');
      }
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

function computeDesc(card){
  const g=card.grade||1;
  const gm=g; // GRADE_MULT[g] === g (線形)
  const enc=card.enchants||[];
  if(card.kind==='summon'&&card.summon){
    if(card.unique==='mirror') return '戦闘開始時、右の契約のコピーとして動作する（右の契約の後に処理）';
    let cnt=(card.count||1)+enc.filter(e=>e==='増殖').length*g;
    const cntPre=cnt>1?cnt+'体の':'';
    const trigDesc={'battle_start':'戦闘開始時','turn_start':'ターン開始時','on_summon':'仲間召喚時','on_spell':'杖使用時',
      'on_full_board':'盤面6体時','on_outnumbered':'敵数3倍以上のターン開始時'};
    let trigStr=trigDesc[card.trigger]||'';
    if(card.trigger==='on_damage_count'){
      const tgt=card.triggerCount||15;
      const ringInst=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.id===card.id):null;
      const rem=ringInst?Math.max(0,tgt-(ringInst._count||0)):tgt;
      trigStr=`累計${tgt}回ダメージ時（あと${rem}）`;
    } else if(card.trigger==='on_death_count'){
      const tgt=card.triggerCount||5;
      const ringInst=typeof G!=='undefined'&&G.rings?G.rings.find(r=>r&&r.id===card.id):null;
      const rem=ringInst?Math.max(0,tgt-(ringInst._count||0)):tgt;
      trigStr=`仲間累計${tgt}回死亡時（あと${rem}）`;
    }
    const trig=trigStr?trigStr+'、':'';
    if(card.unique==='shadow_copy') return trig+'最高ATKの仲間のコピーを召喚';
    if(card.unique==='djinn_replace') return trig+'魔神以外を全破壊して魔神を召喚';
    const extra=card.unique==='wolf_aura'?` 狼生存中、全仲間ATK+${g}`
      :card.unique==='rat_extra'?' 仲間召喚時、鼠を2体追加召喚（自身は除く）'
      :card.unique==='wall_copy_atk'?' ATK=最高味方ATK'
      :'';
    const guardExtra=card.guardian?' 守護（攻撃を受けた時、他の仲間が反撃）':'';
    const deathExtra=card.onDeath==='stone_death'?` 死亡時、全仲間HP+${g*2}`
      :card.onDeath==='shadow_death'?` 死亡時、全キャラに${Math.max(1,g)}ダメ`
      :'';
    const regenExtra=card.regen?' 再生付き':'';
    return trig+cntPre+card.summon.name+'を召喚'+extra+guardExtra+deathExtra+regenExtra;
  }
  if(card.kind==='passive'){
    const m={'needle':'ターン開始時、ランダムな敵に1ダメを与える。これを'+g+'回繰り返す（複数の敵に当たる）',
      'adj_count':'隣接する召喚契約の召喚数+1（★固定）',
      'life_reg':'戦闘終了時ライフ+'+g,
      'fury_passive':'キャラがダメージを受けるたび全仲間ATK+'+g,
      'extra_action':'行動回数+'+g,
      'buff_adj':'戦闘終了時、隣接する召喚契約の仲間ATK/HP+'+g+'（永続累積）',
      'shared_def':'同名仲間が複数いる場合、全員ATK+'+(5*gm)+'/HP+'+(5*gm),
      'poison_aura':'ダメージを受けた敵に毒（HP-'+(3*g)+'/T、重複可）',
      'catalyst':'毒ダメージx'+(g+1)+'倍',
      'farsight':'鍛冶屋・休息所の出現率+50%。すべての選択肢を選べる',
      'mana_cycle':'装備中の杖のチャージが減らなくなる',
      'catalyst_ring':'消耗品の効果が2倍になる',
      'solitude':'盤面に仲間が1体だけの時、その仲間のATK/HP×2',
      'trials':'4回リロールするたびにランダムな契約を1グレードアップ',
      'patience':'「戦闘開始時」の契約効果をターン開始時にも発動する'};
    return m[card.unique]||card.desc;
  }
  if(card.type==='wand'||card.type==='consumable'){
    const uses=card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?');
    const usesStr=card.type==='wand'?' (残'+uses+'回）':'';
    const m={'fire':'対象の敵に'+(2*g)+'ダメ','hate':'対象の仲間にヘイト付与（戦闘終了まで）',
      'double_hp':'対象の仲間のHPを2倍','swap_all':'全キャラのATK/HPを入れ替え','nullify':'対象の敵のATKを0（1ターン）',
      'boost':'対象の仲間のATK・HP+'+(50*g)+'%','rally':'全仲間ATK+'+(30*g)+'%',
      'heal_ally':'対象の仲間のHPを最大値の'+(30*g)+'%回復',
      'golem':(10*g)+'/'+(10*g)+'のヘイト持ちゴーレムを召喚',
      'spread':'もう片方の杖が'+(g+1)+'回発動（戦闘終了まで）',
      'meteor':'ランダムなキャラに'+(3*g)+'ダメx2回',
      'instakill':'対象に即死付与（攻撃したユニットが即死）',
      'bomb':'全敵にグレードx5ダメ','revive':'最後に死んだ仲間をHP50%で復活',
      'big_rally':'全仲間ATK・HP+100%','gold_8':'ソウル+8'};
    return (m[card.effect]||card.desc)+usesStr;
  }
  if(card.isEnchant) return '契約に「'+card.enchantType+'」を付与する';
  return card.desc||'';
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
