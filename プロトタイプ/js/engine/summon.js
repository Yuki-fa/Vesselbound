// ═══════════════════════════════════════
// summon.js — 召喚エンジン
// 依存: constants.js, state.js
// ═══════════════════════════════════════

// 行動の指輪・宿屋ボーナスによる行動回数を計算
function calcActions(){
  let n=3;
  G.rings.forEach(r=>{ if(r&&r.unique==='extra_action') n+=1; }); // 行動の指輪は常に+1（グレード無関係）
  if(G._bonusAction) n+=G._bonusAction; // 宿屋ボーナス（永続）
  if(G._minotaurBonus) n+=G._minotaurBonus; // ミノタウロス：ボス戦で+1
  return n;
}

function triggerDraugSummonChoice(unit){
  if(!unit||unit.effect!=='draug_summon') return;
  const _draugCands=G.allies.map((a,i)=>({a,i})).filter(x=>x.a&&x.a.hp>0&&x.a!==unit&&!(x.a.keywords||[]).includes('毒牙'));
  if(!_draugCands.length) return;
  setTimeout(()=>{
    if(typeof clearSelectable==='function') clearSelectable();
    if(typeof setHint==='function') setHint(`${unit.name}：毒牙を付与する仲間を選択（右クリックでキャンセル=ランダム）`);
    const slots=typeof _getAllyDomSlots==='function'?_getAllyDomSlots():[];
    slots.forEach((slot,i)=>{
      const cand=_draugCands.find(x=>x.i===i);
      if(cand&&slot){
        slot.classList.add('selectable');
        slot.onclick=()=>{
          if(typeof clearSelectable==='function') clearSelectable();
          cand.a.keywords=[...(cand.a.keywords||[]),'毒牙'];
          log(`${unit.name}：${cand.a.name}に「毒牙」を付与`,'good');
          if(typeof renderAll==='function') renderAll();
          if(typeof finishTargetSelection==='function') finishTargetSelection();
          else if(typeof clearSelectable==='function') clearSelectable();
        };
      }
    });
  },50);
}

function triggerMedusaSummonChoice(unit){
  if(!unit||unit.effect!=='medusa_summon') return;
  const cands=G.allies.map((a,i)=>({a,i})).filter(x=>x.a&&x.a.hp>0&&!(x.a.keywords||[]).includes('二段攻撃'));
  if(!cands.length) return;
  setTimeout(()=>{
    if(typeof clearSelectable==='function') clearSelectable();
    if(typeof setHint==='function') setHint(`${unit.name}：二段攻撃を付与する仲間を選択（右クリックでキャンセル）`);
    const slots=typeof _getAllyDomSlots==='function'?_getAllyDomSlots():[];
    slots.forEach((slot,i)=>{
      const cand=cands.find(x=>x.i===i);
      if(cand&&slot){
        slot.classList.add('selectable');
        slot.onclick=()=>{
          if(typeof clearSelectable==='function') clearSelectable();
          cand.a.keywords=[...(cand.a.keywords||[]),'二段攻撃'];
          log(`${unit.name}：${cand.a.name}に「二段攻撃」を付与`,'good');
          if(typeof renderAll==='function') renderAll();
          if(typeof finishTargetSelection==='function') finishTargetSelection();
          else if(typeof clearSelectable==='function') clearSelectable();
        };
      }
    });
  },50);
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
  if(unit.effect==='grimalkin_summon'){
    const v=(unit._stackCount||0)+1+(G.hasGoldenDrop?1:0);
    G._grimalkinBonus=(G._grimalkinBonus||0)+v;
    log(`${unit.name}：以後のカード効果召喚が±0/+${v}（累計+${G._grimalkinBonus}）`,'good');
  }
  if(unit.effect==='imp_summon'){
    const _slot=G.spells.findIndex(s=>!s);
    if(_slot>=0){
      const _item=typeof drawConsumable==='function'?drawConsumable(1):null;
      if(_item){ G.spells[_slot]=_item; log(`${unit.name}：使役→G1アイテムを入手`,'good'); }
    }
  }
  // ケンタウロス：開戦時に魔術レベル+1（onBattleStartで処理）
  // ミテーラ：召喚時、最も左の空き地に1/3の「ペリカン」を召喚
  if(unit.effect==='mitera_summon'){
    const _pelG=unit.grade||1;
    const _pelDef=makeSheetBackedUnitDef({id:'c_pelican',name:'ペリカン',race:'獣',grade:_pelG,atk:_pelG,hp:3*_pelG,cost:0,unique:false,icon:'🦤',desc:''});
    if(addAlly(makeUnitFromDef(_pelDef),null,true)) log(`${unit.name}：ペリカン(${_pelG}/${3*_pelG})を召喚`,'good');
  }
  // シルフ：召喚時、隣接する仲間が+1/+2を得る
  if(unit.effect==='sylph_summon'){
    const _si=G.allies.indexOf(unit); const _sv=(unit._stackCount||0)+1+(G.hasGoldenDrop?1:0);
    [G.allies[_si-1],G.allies[_si+1]].forEach(b=>{ if(b&&b.hp>0) applyUnitBuff(b,_sv,2*_sv,'ally'); });
    log(`${unit.name}：使役→隣接する仲間+${_sv}/+${2*_sv}`,'good');
  }
  // ドワーフ：召喚時、最も左の杖にシート記載値分チャージ
  if(unit.effect==='dwarf_summon'){
    const _wi=G.spells.findIndex(s=>s&&s.type==='wand');
    const _nums=[...((unit.desc||'').matchAll(/\d+/g))].map(m=>parseInt(m[0]));
    const _dc=(_nums[0]||2)*((unit._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
    if(_wi>=0){ G.spells[_wi].usesLeft=(G.spells[_wi].usesLeft||0)+_dc; log(`${unit.name}：${G.spells[_wi].name}に充填+${_dc}`,'good'); }
  }
  if(unit.effect==='rukh_summon'){
    const ri=G.allies.indexOf(unit);
    [ri-1,ri+1].forEach(i=>{
      const a=G.allies[i];
      if(a&&a.hp>0&&unitMatchesRace(a,'獣')){
        a.grade=(a.grade||1)+1;
        log(`${unit.name}：${a.name}のグレード+1（G${a.grade}）`,'good');
      }
    });
  }
  if(unit.effect==='medusa_summon'&&typeof triggerMedusaSummonChoice==='function'){
    triggerMedusaSummonChoice(unit);
  }
  if(unit.effect==='ogre_summon'){
    if((G.magicLevel||1)>=10){
      unit.keywords=unit.keywords||[];
      if(!unit.keywords.includes('三方向攻撃')) unit.keywords.push('三方向攻撃');
      log(`${unit.name}：魔術Lv10以上→三方向攻撃を獲得`,'good');
    }
  }
  // ドラウグ：召喚時、対象の別の仲間に「毒牙」を付与（プレイヤー選択）
  if(unit.effect==='draug_summon'){
    triggerDraugSummonChoice(unit);
  }
  // スリン：旧効果（slin_summon）削除済み
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
function applyGrimalkinSummonBonus(unit, sideUnits, logColor='good'){
  return 0;
}

function addAlly(unit, fromRingId, fromCharEffect=false){
  // 報酬フェイズ中は報酬枠へ誘導
  if(G.phase==='reward'&&typeof addRewChar==='function'){ addRewChar(unit); return true; }
  if(G.allies.filter(a=>a&&a.hp>0).length>=6) return false;
  const empty=G.allies.findIndex(a=>!a||a.hp<=0);
  if(empty>=0) G.allies[empty]=unit;
  else G.allies.push(unit);
  if(typeof playSfx==='function') playSfx('summon',{group:'magic'});
  G.battleCounters.summons++;
  // 憤激の指輪：戦闘中に召喚された仲間にもボーナスを即時適用
  if(G.phase!=='reward'){
    const _furyR=G.rings&&G.rings.find(r=>r&&r.unique==='fury_start');
    if(_furyR){ const _fb=3*(_furyR.grade||1); unit.atk+=_fb; unit.baseAtk=(unit.baseAtk||0)+_fb; unit._furyAtk=(unit._furyAtk||0)+_fb; }
  }
  // グリマルキン（passive）：カード効果（指輪・キャラ効果どちらも）で召喚された仲間にボーナス
  if(fromCharEffect || fromRingId){
    applyGrimalkinSummonBonus(unit,G.allies);
    // コカトリス：自陣・敵陣両方のコカトリスにトリガー（キャラ効果召喚時のみ）
    if(fromCharEffect && typeof triggerCocatrice==='function') triggerCocatrice(unit);
  }
  applyUnitSummonEffect(unit, fromRingId);
  triggerCheshireSummon(unit,'ally');
  return true;
}

function triggerCheshireSummon(summonedUnit, side='ally'){
  const units=side==='enemy'?G.enemies:G.allies;
  const col=side==='enemy'?'bad':'good';
  (units||[]).forEach(c=>{
    if(!c||c.hp<=0||c.effect!=='cheshire_summon'||c===summonedUnit) return;
    const v=(c._stackCount||0)+1+(side==='ally'&&G.hasGoldenDrop?1:0);
    units.forEach(a=>{ if(a&&a.hp>0&&unitMatchesRace(a,'獣')) applyUnitBuff(a,v,v,side); });
    log(`${c.name}：仲間召喚→全仲間の獣+${v}/+${v}`,col);
  });
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

// ピグミーのATKを現在の魔術レベルに同期する
// _atkBonusに魔術レベル以外で増えたバフ分を保持し、同期時に加算する
// 初回同期時は _lastSyncMl が未設定なので atk - ml をボーナスとして記録
function syncHarpyAtk(){
  const ml=G.magicLevel||1;
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    if(a.effect==='pigmy_magic'){
      // 前回の同期済みATK（魔術レベル分）と現在のATKの差がバフ分
      const _prevMlAtk=a._lastSyncMl!=null?a._lastSyncMl:ml;
      const _bonus=Math.max(0,(a.atk||0)-_prevMlAtk);
      a._atkBonus=_bonus;
      a.atk=ml+_bonus;
      a.baseAtk=ml+_bonus;
      a._lastSyncMl=ml;
    }
  });
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

// キャラクター効果でキャラが召喚された時のコカトリストリガー
// summonedUnit: 召喚されたユニット（除外対象として使用）
function triggerCocatrice(summonedUnit){
  const _gd=G.hasGoldenDrop?1:0;
  // 自陣・敵陣両方のコカトリスを確認
  [...G.allies, ...G.enemies].forEach(g=>{
    if(!g||g.hp<=0||g.effect!=='cocatrice_passive') return;
    if(g===summonedUnit) return; // 召喚されたユニット自身は除外
    const _cnums=[...(g.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
    const _cv=(_cnums[0]||2)+_gd;
    g.hp+=_cv; g.maxHp+=_cv;
    log(`${g.name}：キャラ効果召喚→±0/+${_cv}`,'good');
  });
}
