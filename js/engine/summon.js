// ═══════════════════════════════════════
// summon.js — 召喚エンジン
// 依存: constants.js, state.js
// ═══════════════════════════════════════

// 行動の指輪による行動回数を計算
function calcActions(){
  let n=1;
  G.rings.forEach(r=>{ if(r&&r.unique==='extra_action') n+=(r.grade||1); });
  return n;
}

// 隣接する指輪を返す
function adjacentRings(idx){
  const res=[];
  if(G.rings[idx-1]) res.push({ring:G.rings[idx-1],idx:idx-1});
  if(G.rings[idx+1]) res.push({ring:G.rings[idx+1],idx:idx+1});
  return res;
}

// 指輪から仲間ユニットを生成（エンチャント・永続ボーナスを反映）
function makeUnit(ring, overrideAtk, overrideHp, overrideName, overrideIcon){
  const grade=ring.grade||1;
  const mult=GRADE_MULT[grade];
  const s=ring.summon||{atk:1,hp:1,name:'？',icon:'？'};
  const bab=G.buffAdjBonuses[ring.id]||{atk:0,hp:0};
  const enc=ring.enchants||[];
  const gm=mult;
  const baseAtk=ring.atkPerGrade!==undefined?s.atk+ring.atkPerGrade*(grade-1):Math.round(s.atk*mult);
  const baseHp =ring.hpPerGrade !==undefined?s.hp +ring.hpPerGrade *(grade-1):Math.round(s.hp *mult);
  let bAtk=overrideAtk!==undefined?overrideAtk:baseAtk+bab.atk+(enc.filter(e=>e==='凶暴').length*5*gm);
  let bHp =overrideHp !==undefined?overrideHp :baseHp +bab.hp +(enc.filter(e=>e==='強壮').length*5*gm);
  if(enc.includes('堅牢')) bHp=Math.round(bHp*1.3);
  return {
    id:uid(),
    name:overrideName||s.name,
    icon:overrideIcon||s.icon,
    atk:bAtk,baseAtk:bAtk,hp:bHp,maxHp:bHp,
    ringId:ring.id,ringIdx:G.rings.indexOf(ring),
    hate:enc.includes('憎悪'),hateTurns:enc.includes('憎悪')?99:0,
    instadead:false,sealed:0,nullified:0,
    enchants:enc,regen:enc.includes('再生'),regenUsed:false,
    onDeath:ring.onDeath,onHit:ring.onHit,
    taunt50:ring.taunt50||false,guardian:ring.guardian||false,
    unique:ring.unique,
    keywords:ring.keywords||[],
    poison:0,shield:0,_dp:false,
  };
}

// 盤面に仲間を1体追加。成功したら on_summon / on_full_board トリガーを発火
function addAlly(unit, fromRingId){
  if(G.allies.filter(a=>a.hp>0).length>=6) return false;
  const empty=G.allies.findIndex(a=>a.hp<=0);
  if(empty>=0) G.allies[empty]=unit;
  else G.allies.push(unit);
  G.battleCounters.summons++;
  if(!G._djinnActive){
    fireTrigger('on_summon', fromRingId);
    if(G.allies.filter(a=>a.hp>0).length>=6) fireTrigger('on_full_board', fromRingId);
  }
  return true;
}

// 指定トリガーを持つ指輪をすべて発火
function fireTrigger(trigger, sourceRingId){
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!==trigger) return;
    if(ring.id===sourceRingId&&trigger==='on_summon') return; // 自分自身の on_summon は無視
    if(trigger==='on_summon'&&G.phase==='enemy') return;
    triggerSummon(ring);
  });
}

// 指輪の召喚効果を実行
function triggerSummon(ring){
  if(!ring||!ring.summon&&ring.unique!=='shadow_copy'&&ring.unique!=='djinn_replace') return;
  const enc=ring.enchants||[];
  // adj_count パッシブによる召喚数ボーナスを計算
  const ringIdx=G.rings.indexOf(ring);
  let adjBonus=0;
  G.rings.forEach((r,ri)=>{
    if(!r||r.unique!=='adj_count') return;
    if(Math.abs(ri-ringIdx)===1) adjBonus+=1;
  });
  let count=(ring.count||1)+adjBonus+enc.filter(e=>e==='増殖').length*(ring.grade||1);

  if(ring.unique==='shadow_copy'){
    const living=G.allies.filter(a=>a.hp>0);
    if(!living.length) return;
    const strongest=living.reduce((a,b)=>a.atk>=b.atk?a:b);
    const copy={...clone(strongest),id:uid(),_dp:false};
    if(addAlly(copy,ring.id)) log(`👻 影のコピー：${copy.name}(${copy.atk}/${copy.hp})を召喚`,'good');
    return;
  }

  if(ring.unique==='djinn_replace'){
    const living=G.allies.filter(a=>a.hp>0);
    const nonDjinn=living.filter(a=>a.name!=='魔神');
    if(nonDjinn.length<6) return;
    if(G._djinnActive) return; // 再帰防止
    G._djinnActive=true;
    log('👿 魔神降臨：魔神以外の全仲間を破壊！','bad');
    G.allies.forEach(a=>{
      if(a.hp>0&&a.name!=='魔神'){ a.hp=0; onAllyDeath(a); }
    });
    const djinn=makeUnit(ring);
    const empty=G.allies.findIndex(a=>a.hp<=0);
    if(empty>=0) G.allies[empty]=djinn; else G.allies.push(djinn);
    log(`👿 魔神（${djinn.atk}/${djinn.hp}）召喚！`,'good');
    G._djinnActive=false;
    return;
  }

  for(let i=0;i<count;i++){
    const unit=makeUnit(ring);
    if(!addAlly(unit,ring.id)) break;
    log(`✨ ${ring.name}：${unit.name}(${unit.atk}/${unit.hp})を召喚`,'good');
  }
}

// 戦闘開始時に全指輪の battle_start 召喚を処理
function summonAllies(){
  G.allies=[];
  G.actionsPerTurn=calcActions();
  G.battleCounters={damage:0,deaths:0,summons:0,deathTriggerNext:10,damageTriggerNext:12};

  // adj_count パッシブ（隣接召喚指輪の召喚数+グレード倍率）を先に計算
  const adjBonus={};
  G.rings.forEach((ring,hi)=>{
    if(!ring||ring.unique!=='adj_count') return;
    [-1,1].forEach(d=>{
      const ni=hi+d;
      if(G.rings[ni]&&G.rings[ni].kind==='summon') adjBonus[ni]=(adjBonus[ni]||0)+1;
    });
  });

  // battle_start トリガーの指輪を左から順に処理
  G.rings.forEach((ring,hi)=>{
    if(!ring||ring.kind!=='summon'||ring.trigger!=='battle_start') return;
    if(!ring.summon) return;
    const grade=ring.grade||1;
    const mult=GRADE_MULT[grade];
    const enc=ring.enchants||[];
    const gm=mult;
    const baseAtk=ring.atkPerGrade!==undefined?ring.summon.atk+ring.atkPerGrade*(grade-1):Math.round(ring.summon.atk*mult);
    const baseHp =ring.hpPerGrade !==undefined?ring.summon.hp +ring.hpPerGrade *(grade-1):Math.round(ring.summon.hp *mult);
    let bAtk=baseAtk+(G.buffAdjBonuses[ring.id]?.atk||0)+enc.filter(e=>e==='凶暴').length*5*gm;
    let bHp =baseHp +(G.buffAdjBonuses[ring.id]?.hp||0)+enc.filter(e=>e==='強壮').length*5*gm;
    if(enc.includes('堅牢')) bHp=Math.round(bHp*1.3);
    let count=(ring.count||1)+(adjBonus[hi]||0)+enc.filter(e=>e==='増殖').length*(ring.grade||1);
    for(let i=0;i<count;i++){
      if(G.allies.filter(a=>a.hp>0).length>=6) break;
      const unit={
        id:uid(),name:ring.summon.name,icon:ring.summon.icon,
        atk:bAtk,baseAtk:bAtk,hp:bHp,maxHp:bHp,
        ringId:ring.id,ringIdx:hi,
        hate:enc.includes('憎悪'),hateTurns:enc.includes('憎悪')?99:0,
        instadead:false,sealed:0,nullified:0,
        enchants:enc,regen:enc.includes('再生'),regenUsed:false,
        onDeath:ring.onDeath,onHit:ring.onHit,
        taunt50:ring.taunt50||false,guardian:ring.guardian||false,
        unique:ring.unique,keywords:ring.keywords||[],poison:0,shield:0,_dp:false,
      };
      G.allies.push(unit);
      G.battleCounters.summons++;
      if(!G._djinnActive){
        fireTrigger('on_summon',ring.id);
        if(G.allies.filter(a=>a.hp>0).length>=6) fireTrigger('on_full_board',ring.id);
      }
    }
  });

  // 鏡の契約：右の召喚契約のコピーとして battle_start 後に発動
  G.rings.forEach((ring,hi)=>{
    if(!ring||ring.unique!=='mirror') return;
    const right=G.rings[hi+1];
    if(!right||right.kind!=='summon') return;
    const tempRing=clone(right);
    tempRing.grade=ring.grade||1;
    triggerSummon(tempRing);
    log(`🪞 鏡の契約：${right.name}のコピーとして発動`,'good');
  });

  // 狼のオーラ（狼生存中、全仲間ATK+）
  const wolfRings=G.rings.filter(r=>r&&r.unique==='wolf_aura');
  if(wolfRings.length>0&&G.allies.some(a=>a.name==='狼'&&a.hp>0)){
    const bonus=2*GRADE_MULT[wolfRings[0].grade||1]*wolfRings.length;
    G.allies.forEach(a=>{ a.atk+=bonus; });
    log(`狼のオーラ：全仲間ATK+${bonus}`,'good');
  }

  // 共鳴の指輪（同名仲間が複数いる場合にATK/HP+）
  G.rings.forEach(ring=>{
    if(!ring||ring.unique!=='shared_def') return;
    const bonus=5*GRADE_MULT[ring.grade||1];
    const names={};
    G.allies.forEach(a=>{ if(a.hp>0) names[a.name]=(names[a.name]||0)+1; });
    Object.entries(names).forEach(([nm,cnt])=>{
      if(cnt>=2){
        G.allies.forEach(a=>{ if(a.name===nm&&a.hp>0){ a.atk+=bonus; a.hp+=bonus; a.maxHp+=bonus; }});
        log(`共鳴：${nm}×${cnt}体にATK+${bonus}/HP+${bonus}`,'good');
      }
    });
  });
}

// 仲間死亡時の処理（カウンタ更新・骸骨/影トリガー）
function onAllyDeath(ally){
  G.battleCounters.deaths++;
  if(G._djinnActive) return; // 魔神降臨中はチェーントリガーをスキップ
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!=='on_death_count') return;
    if(G.battleCounters.deaths>=G.battleCounters.deathTriggerNext){
      G.battleCounters.deathTriggerNext+=ring.triggerCount||10;
      triggerSummon(ring);
    }
  });
  if(ally.name!=='骸骨'){
    G.rings.forEach(ring=>{
      if(!ring||ring.trigger!=='on_ally_death_notskel') return;
      const unit=makeUnit(ring);
      if(addAlly(unit,ring.id)) log(`💀 骸骨の指輪：骸骨(${unit.atk}/${unit.hp})を召喚`,'good');
    });
  }
}

// ダメージカウンタ更新（竜の指輪トリガー）
function onDamageCount(){
  G.battleCounters.damage++;
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!=='on_damage_count') return;
    const threshold=ring.triggerCount||12;
    if(G.battleCounters.damage>=G.battleCounters.damageTriggerNext){
      G.battleCounters.damageTriggerNext+=threshold;
      triggerSummon(ring);
      log(`🐉 竜の指輪：${G.battleCounters.damage}回ダメージ到達→竜を召喚`,'good');
    }
  });
}

// 杖使用時のトリガー（石像の指輪）
function onSpellUsed(){
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!=='on_spell') return;
    triggerSummon(ring);
  });
}
