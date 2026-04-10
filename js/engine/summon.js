// ═══════════════════════════════════════
// summon.js — 召喚エンジン
// 依存: constants.js, state.js
// ═══════════════════════════════════════

// 行動の指輪・宿屋ボーナスによる行動回数を計算
function calcActions(){
  let n=1;
  G.rings.forEach(r=>{ if(r&&r.unique==='extra_action') n+=(r.grade||1); });
  if(G._bonusAction) n+=G._bonusAction; // 宿屋ボーナス（永続）
  if(G._minotaurBonus) n+=G._minotaurBonus; // ミノタウロス：ボス戦で+1
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
  const baseAtk=ring.atkPerGrade!==undefined?s.atk+ring.atkPerGrade*(GRADE_COEFF[grade]||grade):Math.round(s.atk*mult);
  const baseHp =ring.hpPerGrade !==undefined?s.hp +ring.hpPerGrade *(GRADE_COEFF[grade]||grade):Math.round(s.hp *mult);
  let bAtk=overrideAtk!==undefined?overrideAtk:baseAtk+bab.atk+(enc.filter(e=>e==='凶暴').length*5*gm);
  let bHp =overrideHp !==undefined?overrideHp :baseHp +bab.hp +(enc.filter(e=>e==='強壮').length*5*gm);
  if(enc.includes('堅牢')) bHp=Math.round(bHp*1.3);
  // 城壁の契約：ATK=盤面最高味方ATK
  if(ring.unique==='wall_copy_atk'&&overrideAtk===undefined){
    bAtk=G.allies.filter(a=>a&&a.hp>0).reduce((m,a)=>Math.max(m,a.atk),0);
  }
  // 黄金の雫：+1を全スタッツに加算
  if(typeof G!=='undefined'&&G.hasGoldenDrop){ bAtk+=1; bHp+=1; }
  return {
    id:uid(),
    name:overrideName||s.name,
    icon:overrideIcon||s.icon,
    atk:bAtk,baseAtk:bAtk,hp:bHp,maxHp:bHp,
    ringId:ring.id,ringIdx:G.rings.indexOf(ring),
    hate:enc.includes('憎悪'),hateTurns:enc.includes('憎悪')?99:0,
    instadead:false,sealed:0,nullified:0,
    enchants:enc,regen:0,
    onDeath:ring.onDeath,onHit:ring.onHit,
    taunt50:ring.taunt50||false,guardian:ring.guardian||false,
    unique:ring.unique,
    keywords:ring.keywords||[],
    poison:0,shield:0,_dp:false,
  };
}

// ユニット召喚時の使役効果を適用（addAlly経由・直接追加どちらからも呼べる）
function applyUnitSummonEffect(unit, fromRingId){
  if(!unit) return;
  // ケンタウロス：召喚時、魔術レベル+1（黄金の雫：+2）
  if(unit.effect==='centaur_summon'){
    const _cv=1+(G.hasGoldenDrop?1:0);
    if(typeof onMagicLevelUp==='function') onMagicLevelUp(_cv);
    else { G.magicLevel=(G.magicLevel||1)+_cv; if(typeof syncHarpyAtk==='function') syncHarpyAtk(); }
    log(`${unit.name}：召喚→魔術レベル+${_cv}（Lv${G.magicLevel}）`,'good');
  }
  // ミテーラ：召喚時、最も左の空き地に1/3の「ペリカン」を召喚
  if(unit.effect==='mitera_summon'){
    const _pelDef={id:'c_pelican',name:'ペリカン',race:'獣',grade:1,atk:1,hp:3,cost:0,unique:false,icon:'🦤',desc:''};
    if(addAlly(makeUnitFromDef(_pelDef),null,true)) log(`${unit.name}：ペリカン(1/3)を召喚`,'good');
  }
  // ジャッカロープ：開戦効果のため、召喚時トリガーは不要（battle.js で処理）
  // コボルド：召喚時、最も左の杖に充填数+1
  if(unit.effect==='kobold_summon'){
    const _wi=G.spells.findIndex(s=>s&&s.type==='wand');
    if(_wi>=0){ G.spells[_wi].usesLeft=(G.spells[_wi].usesLeft||0)+1; log(`${unit.name}：${G.spells[_wi].name}に充填+1`,'good'); }
  }
  // スリン：召喚時、全仲間に「成長1」キーワードを付与
  if(unit.effect==='slin_summon'){
    G.allies.forEach(a=>{ if(a&&a.hp>0&&a!==unit){ if(!a.keywords) a.keywords=[]; const _gi=a.keywords.findIndex(k=>/^成長\d+$/.test(k)); if(_gi>=0) a.keywords[_gi]='成長'+(parseInt(a.keywords[_gi].slice(2))+1); else a.keywords.push('成長1'); }});
    log(`${unit.name}：全仲間に「成長1」を付与`,'good');
  }
  // キメラ：召喚時、ランダムなキーワード3つを得る
  if(unit.effect==='chimera_summon'){
    const _pool=['即死','毒牙5','狩人','標的','成長5','加護','反撃','二段攻撃'];
    const _avail=[..._pool];
    const _chosen=[];
    for(let _i=0;_i<3&&_avail.length>0;_i++){
      const _idx=Math.floor(Math.random()*_avail.length);
      _chosen.push(_avail.splice(_idx,1)[0]);
    }
    if(!unit.keywords) unit.keywords=[];
    _chosen.forEach(k=>{ if(!unit.keywords.includes(k)) unit.keywords.push(k); });
    if(_chosen.includes('反撃')) unit.counter=true;
    if(_chosen.includes('標的')){ unit.hate=true; unit.hateTurns=99; }
    log(`${unit.name}：召喚→キーワード${_chosen.join('、')}を獲得`,'good');
  }
  // on_summon / on_full_board トリガー
  if(!G._djinnActive){
    fireTrigger('on_summon', fromRingId);
    if(G.allies.filter(a=>a&&a.hp>0).length>=6) fireTrigger('on_full_board', fromRingId);
  }
  checkSolitudeBuff();
}

// 盤面に仲間を1体追加。成功したら on_summon / on_full_board トリガーを発火
// fromCharEffect=true の場合はキャラクター効果による召喚（グリマルキン誘発対象）
function addAlly(unit, fromRingId, fromCharEffect=false){
  // 報酬フェイズ中は報酬枠へ誘導
  if(G.phase==='reward'&&typeof addRewChar==='function'){ addRewChar(unit); return true; }
  if(G.allies.filter(a=>a&&a.hp>0).length>=6) return false;
  const empty=G.allies.findIndex(a=>!a||a.hp<=0);
  if(empty>=0) G.allies[empty]=unit;
  else G.allies.push(unit);
  G.battleCounters.summons++;
  // グリマルキン：キャラクター効果で仲間が召喚された時、自身+1/+1
  // コカトリス（passive）：カード効果で召喚された仲間が+2/+1を得る
  if(fromCharEffect){
    const _gd=G.hasGoldenDrop?1:0;
    G.allies.forEach(g=>{
      if(g&&g.hp>0&&g.effect==='grimalkin_onsum'&&g!==unit){
        const _gv=1+_gd;
        g.atk+=_gv; g.baseAtk=(g.baseAtk||0)+_gv; g.hp+=_gv; g.maxHp+=_gv;
        log(`${g.name}：仲間が召喚→+${_gv}/+${_gv}`,'good');
      }
      if(g&&g.hp>0&&g.effect==='cocatrice_passive'&&g!==unit){
        const _cv=2+_gd, _ch=1+_gd;
        unit.atk+=_cv; unit.baseAtk=(unit.baseAtk||0)+_cv; unit.hp+=_ch; unit.maxHp+=_ch;
        log(`${g.name}：カード効果召喚→${unit.name}が+${_cv}/+${_ch}`,'good');
      }
    });
  }
  applyUnitSummonEffect(unit, fromRingId);
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
  // 鼠の契約（rat_extra）：鼠自身の召喚時のみ追加2体（再帰防止フラグあり）
  if(trigger==='on_summon'&&G.phase!=='enemy'&&!G._ratExtraFiring){
    G.rings.forEach(ring=>{
      if(!ring||ring.unique!=='rat_extra') return;
      if(ring.id!==sourceRingId) return; // 鼠自身の召喚時のみ発動
      G._ratExtraFiring=true;
      for(let i=0;i<2;i++){
        const unit=makeUnit(ring);
        if(!addAlly(unit,ring.id)) break;
        log(`🐀 ${ring.name}：鼠(${unit.atk}/${unit.hp})を追加召喚`,'good');
      }
      G._ratExtraFiring=false;
    });
  }
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
    const living=G.allies.filter(a=>a&&a.hp>0);
    if(!living.length) return;
    const strongest=living.reduce((a,b)=>a.atk>=b.atk?a:b);
    const copy={...clone(strongest),id:uid(),_dp:false};
    if(addAlly(copy,ring.id)) log(`👻 影のコピー：${copy.name}(${copy.atk}/${copy.hp})を召喚`,'good');
    return;
  }

  if(ring.unique==='djinn_replace'){
    const living=G.allies.filter(a=>a&&a.hp>0);
    const nonDjinn=living.filter(a=>a.name!=='魔神');
    if(nonDjinn.length<6) return;
    if(G._djinnActive) return; // 再帰防止
    G._djinnActive=true;
    log('👿 魔神降臨：魔神以外の全仲間を破壊！','bad');
    G.allies.forEach(a=>{
      if(a&&a.hp>0&&a.name!=='魔神'){ a.hp=0; onAllyDeath(a); }
    });
    const djinn=makeUnit(ring);
    const empty=G.allies.findIndex(a=>!a||a.hp<=0);
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
  G.battleCounters={damage:0,deaths:0,summons:0,deathTriggerNext:5,damageTriggerNext:15};

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
    if(ring.unique==='mirror') return; // 鏡は専用ブロックで処理
    const grade=ring.grade||1;
    const mult=GRADE_MULT[grade];
    const enc=ring.enchants||[];
    const gm=mult;
    const baseAtk=ring.atkPerGrade!==undefined?ring.summon.atk+ring.atkPerGrade*(GRADE_COEFF[grade]||grade):Math.round(ring.summon.atk*mult);
    const baseHp =ring.hpPerGrade !==undefined?ring.summon.hp +ring.hpPerGrade *(GRADE_COEFF[grade]||grade):Math.round(ring.summon.hp *mult);
    let bAtk=baseAtk+(G.buffAdjBonuses[ring.id]?.atk||0)+enc.filter(e=>e==='凶暴').length*5*gm;
    let bHp =baseHp +(G.buffAdjBonuses[ring.id]?.hp||0)+enc.filter(e=>e==='強壮').length*5*gm;
    if(enc.includes('堅牢')) bHp=Math.round(bHp*1.3);
    // 黄金の雫ボーナス
    bAtk+=(G.hasGoldenDrop?1:0); bHp+=(G.hasGoldenDrop?1:0);
    let count=(ring.count||1)+(adjBonus[hi]||0)+enc.filter(e=>e==='増殖').length*(ring.grade||1);
    for(let i=0;i<count;i++){
      if(G.allies.filter(a=>a&&a.hp>0).length>=6) break;
      // 城壁の契約：ATK=現在の最高味方ATK
      if(ring.unique==='wall_copy_atk') bAtk=G.allies.filter(a=>a&&a.hp>0).reduce((m,a)=>Math.max(m,a.atk),0);
      const unit={
        id:uid(),name:ring.summon.name,icon:ring.summon.icon,
        atk:bAtk,baseAtk:bAtk,hp:bHp,maxHp:bHp,
        ringId:ring.id,ringIdx:hi,
        hate:enc.includes('憎悪'),hateTurns:enc.includes('憎悪')?99:0,
        instadead:false,sealed:0,nullified:0,
        enchants:enc,regen:0,
        onDeath:ring.onDeath,onHit:ring.onHit,
        taunt50:ring.taunt50||false,guardian:ring.guardian||false,
        unique:ring.unique,keywords:ring.keywords||[],poison:0,shield:0,_dp:false,
      };
      G.allies.push(unit);
      G.battleCounters.summons++;
      if(!G._djinnActive){
        fireTrigger('on_summon',ring.id);
        if(G.allies.filter(a=>a&&a.hp>0).length>=6) fireTrigger('on_full_board',ring.id);
      }
    }
  });

  // 鏡の契約：右隣の召喚契約のコピーを直接召喚
  G.rings.forEach((ring,hi)=>{
    if(!ring||ring.unique!=='mirror') return;
    const src=G.rings[hi+1];
    if(!src||src.kind!=='summon'||!src.summon) return;
    const grade=ring.grade||1;
    const mult=GRADE_MULT[grade];
    const enc=src.enchants||[];
    const gm=mult;
    const baseAtk=src.atkPerGrade!==undefined?src.summon.atk+src.atkPerGrade*(GRADE_COEFF[grade]||grade):Math.round(src.summon.atk*mult);
    const baseHp =src.hpPerGrade !==undefined?src.summon.hp +src.hpPerGrade *(GRADE_COEFF[grade]||grade):Math.round(src.summon.hp *mult);
    let bAtk=baseAtk+(G.buffAdjBonuses[src.id]?.atk||0)+enc.filter(e=>e==='凶暴').length*5*gm;
    let bHp =baseHp +(G.buffAdjBonuses[src.id]?.hp||0)+enc.filter(e=>e==='強壮').length*5*gm;
    if(enc.includes('堅牢')) bHp=Math.round(bHp*1.3);
    const count=(src.count||1)+enc.filter(e=>e==='増殖').length*(ring.grade||1);
    for(let i=0;i<count;i++){
      if(G.allies.filter(a=>a&&a.hp>0).length>=6) break;
      const unit={
        id:uid(),name:src.summon.name,icon:src.summon.icon,
        atk:bAtk,baseAtk:bAtk,hp:bHp,maxHp:bHp,
        ringId:ring.id,ringIdx:hi,
        hate:enc.includes('憎悪'),hateTurns:enc.includes('憎悪')?99:0,
        instadead:false,sealed:0,nullified:0,
        enchants:enc,regen:enc.includes('再生')?(src.regen||3):(src.regen||0),
        onDeath:src.onDeath,onHit:src.onHit,
        taunt50:src.taunt50||false,guardian:src.guardian||false,
        unique:src.unique,keywords:src.keywords||[],poison:0,shield:0,_dp:false,
      };
      G.allies.push(unit);
      G.battleCounters.summons++;
      if(!G._djinnActive){
        fireTrigger('on_summon',ring.id);
        if(G.allies.filter(a=>a&&a.hp>0).length>=6) fireTrigger('on_full_board',ring.id);
      }
    }
    log(`🪞 鏡の契約：${src.name}(${bAtk}/${bHp})×${count}体を召喚`,'good');
  });

  // 狼のオーラ（狼生存中、全仲間ATK+Grade per ring）
  const wolfRings=G.rings.filter(r=>r&&r.unique==='wolf_aura');
  if(wolfRings.length>0&&G.allies.some(a=>a&&a.name==='狼'&&a.hp>0)){
    const bonus=wolfRings.reduce((s,r)=>s+(r.grade||1),0);
    G.allies.forEach(a=>{ if(a) a.atk+=bonus; });
    log(`狼のオーラ：全仲間ATK+${bonus}`,'good');
  }

  // 共鳴の指輪（同名仲間が複数いる場合にATK/HP+）
  G.rings.forEach(ring=>{
    if(!ring||ring.unique!=='shared_def') return;
    const bonus=5*GRADE_MULT[ring.grade||1];
    const names={};
    G.allies.forEach(a=>{ if(a&&a.hp>0) names[a.name]=(names[a.name]||0)+1; });
    Object.entries(names).forEach(([nm,cnt])=>{
      if(cnt>=2){
        G.allies.forEach(a=>{ if(a&&a.name===nm&&a.hp>0){ a.atk+=bonus; a.hp+=bonus; a.maxHp+=bonus; }});
        log(`共鳴：${nm}×${cnt}体にATK+${bonus}/HP+${bonus}`,'good');
      }
    });
  });
  // 城壁の契約：全召喚・オーラ適用後にATKを最高味方ATKに同期
  syncWallAtk();
  checkSolitudeBuff();
}

// 城壁の契約ユニットのATKを「非城壁味方の最高ATK」に同期する
function syncWallAtk(){
  const walls=G.allies.filter(a=>a&&a.hp>0&&a.unique==='wall_copy_atk');
  if(!walls.length) return;
  const maxAtk=G.allies.filter(a=>a&&a.hp>0&&a.unique!=='wall_copy_atk').reduce((m,a)=>Math.max(m,a.atk),0);
  walls.forEach(u=>{ u.atk=maxAtk; u.baseAtk=maxAtk; });
}

// ハーピー・ピグミーのATKを現在の魔術レベルに同期する
function syncHarpyAtk(){
  const ml=G.magicLevel||1;
  G.allies.forEach(a=>{ if(a&&a.hp>0&&(a.effect==='harpy_magiclevel'||a.effect==='harpy_magic'||a.effect==='pigmy_magic')){ a.atk=ml; a.baseAtk=ml; } });
}

// 孤高の契約バフチェック（仲間数変化のたびに呼ぶ）
function checkSolitudeBuff(){
  const solRing=G.rings&&G.rings.find(r=>r&&r.unique==='solitude');
  const live=G.allies.filter(a=>a&&a.hp>0);
  if(!solRing||live.length!==1){
    // バフ解除
    G.allies.forEach(a=>{
      if(a&&a._solBuff){
        a.atk=Math.max(1,Math.round(a.atk/2));
        a.maxHp=Math.max(1,Math.round(a.maxHp/2));
        a.hp=Math.min(a.hp,a.maxHp);
        a._solBuff=false;
        log(`孤高の指輪：${a.name} ATK/HP半減（仲間増加）`,'sys');
      }
    });
    return;
  }
  // 1体のみ：バフ付与（未適用なら）
  const a=live[0];
  if(!a._solBuff){
    a.atk*=2; a.maxHp*=2; a.hp=Math.min(a.hp*2,a.maxHp);
    a._solBuff=true;
    log(`孤高の契約：${a.name} ATK/HP×2`,'good');
  }
}

// 仲間死亡時の処理（カウンタ更新・骸骨/影トリガー）
function onAllyDeath(ally){
  G.battleCounters.deaths++;
  // 狼死亡：最後の狼が死んだ場合にオーラを解除
  if(ally.name==='狼'){
    const stillHasWolf=G.allies.some(a=>a&&a.hp>0&&a.name==='狼');
    if(!stillHasWolf){
      const wolfRings=G.rings.filter(r=>r&&r.unique==='wolf_aura');
      if(wolfRings.length>0){
        const bonus=wolfRings.reduce((s,r)=>s+(r.grade||1),0);
        G.allies.forEach(a=>{ if(a.hp>0) a.atk=Math.max(0,a.atk-bonus); });
        log(`狼が死亡：オーラ解除（全仲間ATK-${bonus}）`,'sys');
      }
    }
  }
  if(G._djinnActive) return; // 魔神降臨中はチェーントリガーをスキップ
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!=='on_death_count') return;
    ring._count=(ring._count||0)+1;
    if(ring._count>=(ring.triggerCount||5)){
      ring._count=0;
      triggerSummon(ring);
    }
  });
  checkSolitudeBuff();
}

// ダメージカウンタ更新（竜の指輪トリガー）
function onDamageCount(){
  G.battleCounters.damage++;
  G.rings.forEach(ring=>{
    if(!ring||ring.trigger!=='on_damage_count') return;
    ring._count=(ring._count||0)+1;
    if(ring._count>=(ring.triggerCount||15)){
      ring._count=0;
      triggerSummon(ring);
      log(`🐉 ${ring.name}：${ring.triggerCount||15}回ダメージ到達→竜を召喚`,'good');
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
