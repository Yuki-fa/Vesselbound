// ═══════════════════════════════════════
// spell.js — 魔法使用ロジック
// 依存: constants.js, state.js, battle.js, render.js, summon.js
// ═══════════════════════════════════════

let _tgtCtx=null;

function useSpell(idx){
  const sp=G.spells[idx];
  if(!sp||G.actionsLeft<=0) return;
  if(sp.type==='wand'&&sp.usesLeft<=0) return; // チャージ切れ
  if(sp.needsAlly) pickTarget('ally',idx);
  else if(sp.needsEnemy) pickTarget('enemy',idx,true); // 加護チェックあり
  else applySpell(sp,idx,null);
}

function pickTarget(who,idx,checkBless){
  _tgtCtx={who,idx};
  setHint(`対象を選択（ESCでキャンセル）`);
  const units=who==='ally'?G.allies:G.enemies;
  document.getElementById(who==='ally'?'f-ally':'f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
    const u=units[i];
    if(u&&u.hp>0&&!slot.classList.contains('has-move')){
      // 加護：杖の効果対象にならない
      if(checkBless&&who==='enemy'&&u.keywords&&u.keywords.includes('加護')){
        slot.classList.add('empty'); // グレーアウト表示
        return;
      }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who,idx:i}); };
    }
  });
  document.addEventListener('keydown',escCancel,{once:true});
}

function escCancel(e){ if(e.key==='Escape'){ clearSelectable(); renderHand(); setHint('杖を使うかパスしてください'); } }
function clearSelectable(){ document.querySelectorAll('.selectable').forEach(s=>{ s.classList.remove('selectable'); s.onclick=null; }); }

function applySpell(sp,idx,tgt){
  clearSelectable();
  log(`→ ${sp.name} を使用`,'em');

  // 触媒環の契約：消耗品の効果が2倍
  const catRingC=G.rings.find(r=>r&&r.unique==='catalyst_ring');
  const cMult=(sp.type==='consumable'&&catRingC)?2:1;
  switch(sp.effect){
    case 'fire':{
      const e=G.enemies[tgt.idx]; dealDmgToEnemy(e,2,tgt.idx); log(`炎の杖：${e.name}に2ダメ`,'good');
    break;}
    case 'hate':{ G.allies.forEach(a=>a.hate=false); const a=G.allies[tgt.idx]; a.hate=true; a.hateTurns=99; log(`${a.name}にヘイト（戦闘終了まで）`); break;}
    case 'double_hp':{ const a=G.allies[tgt.idx]; a.hp*=2; a.maxHp*=2; log(`${a.name} HP×2→${a.hp}`,'good'); break;}
    case 'swap_all':{
      // 死亡ユニットを除いてATK/HP入れ替え
      [...G.allies,...G.enemies].forEach(u=>{
        if(u.hp<=0) return;
        const t=u.atk; u.atk=u.hp; u.hp=Math.max(1,t); u.maxHp=Math.max(u.maxHp,u.hp);
      });
      // 入れ替え後に狼オーラを再付与（入れ替え前のATKがHPに移ったため、新ATKにも再度乗せる）
      G.rings.forEach(r=>{
        if(!r||r.unique!=='wolf_aura') return;
        if(G.allies.some(a=>a.hp>0&&a.ringId===r.id)){
          const bonus=r.grade||1;
          G.allies.forEach(a=>{ if(a.hp>0) a.atk+=bonus; });
        }
      });
      log('全キャラATK/HP入れ替え','sys');
    break;}
    case 'nullify':{ G.enemies[tgt.idx].nullified=1; log(`${G.enemies[tgt.idx].name} 沈黙1T`,'good'); break;}
    case 'boost':{ const a=G.allies[tgt.idx]; a.atk=Math.round(a.atk*1.5); a.maxHp=Math.round(a.maxHp*1.5); a.hp=Math.min(Math.round(a.hp*1.5),a.maxHp); log(`${a.name} ATK/HP×1.5`,'good'); break;}
    case 'rally':{ G.allies.forEach(a=>{ a.atk=Math.round(a.atk*1.2); }); log('全仲間ATK×1.2','good'); break;}
    case 'heal_ally':{ G.allies.forEach(a=>{ if(a.hp>0) a.hp=a.maxHp; }); log('全仲間HP全回復','good'); break;}
    case 'seal':{ G.enemies[tgt.idx].sealed=1; log(`${G.enemies[tgt.idx].name} 封印1T`,'good'); break;}
    case 'spread':{
      // 右隣の杖の効果を発動（アクション消費なし）
      const rightIdx=idx+1;
      const rw=(rightIdx<G.wandSlots)?G.spells[rightIdx]:null;
      if(rw&&rw.type==='wand'&&(rw.usesLeft===undefined||rw.usesLeft>0)){
        log(`拡散：${rw.name}を発動`,'sys');
        G.actionsLeft++; // 内部呼出のデクリメントを補償（拡散自体は1アクション消費のまま）
        if(!rw.needsEnemy&&!rw.needsAlly&&!rw.needsAny){
          applySpell(rw,rightIdx,null);
        } else if(rw.needsEnemy){
          const live=G.enemies.map((e,i)=>({e,i})).filter(x=>x.e.hp>0&&!(x.e.keywords?.includes('加護')));
          if(live.length) applySpell(rw,rightIdx,{who:'enemy',idx:randFrom(live).i});
          else G.actionsLeft--;
        } else if(rw.needsAlly){
          const live=G.allies.map((a,i)=>({a,i})).filter(x=>x.a.hp>0);
          if(live.length) applySpell(rw,rightIdx,{who:'ally',idx:randFrom(live).i});
          else G.actionsLeft--;
        }
      } else {
        log('拡散：右隣に有効な杖がない','sys');
      }
    break;}
    case 'instakill':{
      if(tgt){
        const target=G.enemies[tgt.idx]||G.allies[tgt.idx];
        if(target){ target.instadead=true; log(`${target.name}に即死付与（攻撃したユニットが即死）`,'good'); }
      }
    break;}
    case 'golem':{
      if(G.allies.filter(a=>a.hp>0).length<6){
        const golem={id:uid(),name:'ゴーレム',icon:'🗼',atk:2,baseAtk:2,hp:2,maxHp:2,
          ringId:'w_golem',ringIdx:-1,hate:true,hateTurns:99,instadead:false,sealed:0,nullified:0,
          enchants:[],regen:false,regenUsed:false,onDeath:undefined,onHit:undefined,
          taunt50:false,guardian:false,unique:undefined,keywords:[],poison:0,shield:0,_dp:false};
        const emptySlot=G.allies.findIndex(a=>a.hp<=0);
        if(emptySlot>=0) G.allies[emptySlot]=golem;
        else if(G.allies.length<6) G.allies.push(golem);
        log('🗼 ゴーレム（2/2・ヘイト）を召喚','good');
      }
    break;}
    case 'meteor':{
      G.enemies.forEach((e,i)=>{ if(e.hp>0) dealDmgToEnemy(e,1,i); });
      G.allies.forEach(a=>{ if(a.hp>0){ a.hp=Math.max(0,a.hp-1); } });
      log('☄ 隕石の杖：全キャラに1ダメ','bad');
    break;}
    case 'bomb':{ const dmg=(G.enemies[0]?.grade||1)*5*cMult; G.enemies.forEach((e,i)=>{ if(e.hp>0) dealDmgToEnemy(e,dmg,i); }); log(`全体爆弾 全敵に${dmg}ダメ`+(cMult>1?' [×2]':''),'bad'); break;}
    case 'revive':{ if(G.lastDead){ const c=clone(G.lastDead); c.hp=Math.min(Math.floor(c.maxHp*.5*cMult),c.maxHp); c.id=uid(); const s=G.allies.findIndex(a=>a.hp<=0); if(s>=0) G.allies[s]=c; else if(G.allies.length<6) G.allies.push(c); log(`${c.name} 復活！`+(cMult>1?' [HP×2]':''),'good'); } else log('復活対象なし'); break;}
    case 'big_rally':{ const rm=1+cMult; G.allies.forEach(a=>{ a.atk=Math.round(a.atk*rm); a.maxHp=Math.round(a.maxHp*rm); a.hp=Math.min(Math.round(a.hp*rm),a.maxHp); }); log(`鼓舞の旗：全仲間+${Math.round((rm-1)*100)}%！`+(cMult>1?' [×2]':''),'good'); break;}
    case 'gold_8':{ G.gold+=8*cMult; log(`ソウル+${8*cMult}`+(cMult>1?' [×2]':''),'gold'); break;}
    case 'soul_dregs':{
      // G4以下の契約を1つ選んでグレードを次の戦闘終了まで+1
      const eligible=G.rings.filter(r=>r&&(r.grade||1)<MAX_GRADE);
      if(!eligible.length){ log('魂の残滓：グレードを上げられる契約がない','sys'); break; }
      if(eligible.length===1){
        eligible[0].grade++;
        eligible[0]._tempGrade=true;
        log(`💀 魂の残滓：${eligible[0].name} グレード+1（次の戦闘終了まで）`,'good');
      } else {
        // 複数ある場合は選択UI（arcana-pick-overlayを再利用）
        _arcanaPickTarget('魂の残滓', eligible.map(r=>({...r,_isRing:true})), (target)=>{
          const ring=G.rings.find(r=>r&&r.id===target.id);
          if(ring){ ring.grade++; ring._tempGrade=true; log(`💀 魂の残滓：${ring.name} グレード+1（次の戦闘終了まで）`,'good'); }
        });
      }
    break;}
    case 'shield_ally':{ const a=G.allies[tgt.idx]; a.shield=(a.shield||0)+1; log(`🛡 ${a.name}にシールド+1`,'good'); break;}
    case 'copy_scroll':{
      if(!G.commanderWands||!G.commanderWands.length){ log('複製の巻物：敵の司令官杖がない','sys'); break; }
      if(G.spells.slice(0,G.wandSlots).filter(s=>s).length>=G.wandSlots){ log('杖枠が満杯','bad'); break; }
      const picked=randFrom(G.commanderWands);
      const pw=clone(SPELL_POOL.find(s=>s.effect===picked.playerEffect)||{id:picked.id,name:picked.name,type:'wand',effect:picked.playerEffect,baseUses:3});
      pw.usesLeft=pw.baseUses||3; pw._maxUses=pw.usesLeft;
      let placed=false;
      for(let j=0;j<G.wandSlots;j++){ if(!G.spells[j]){ G.spells[j]=pw; placed=true; break; } }
      if(!placed) G.spells.splice(G.wandSlots,0,pw);
      log(`📜 複製の巻物：${pw.name} を入手`,'good');
    break;}
    case 'destroy_scroll':{
      if(!G.commanderWands||!G.commanderWands.length){ log('破壊の巻物：敵の司令官杖がない','sys'); break; }
      const dw=randFrom(G.commanderWands);
      const di=G.commanderWands.indexOf(dw);
      G.commanderWands.splice(di,1);
      G.gold+=3; updateHUD();
      const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
      log(`🔥 破壊の巻物：${dw.name} を破壊してソウル+3`,'gold');
    break;}
  }

  if(sp.type==='consumable') G.spells[idx]=null;

  // 石像の契約：杖使用トリガー（消耗品は対象外）
  if(sp.type==='wand') onSpellUsed();

  // 使用回数管理
  if(sp.type==='wand'){
    if(sp.usesLeft===undefined) sp.usesLeft=1; // fallback
    const manaCycle=G.rings.find(r=>r&&r.unique==='mana_cycle');
    if(!manaCycle){
      if(sp.effect!=='spread') sp.usesLeft--;
      if(sp.usesLeft<=0){ log(`${sp.name}のチャージが切れた`,'sys'); G.spells[idx]=null; }
    }
  }

  G.actionsLeft--;
  renderAll();
  if(checkInstantVictory()) return;
  if(G.actionsLeft<=0){
    setHint('行動終了。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else {
    const hasUsable=G.spells.some(sp=>sp&&(sp.type==='consumable'||(sp.type==='wand'&&(sp.usesLeft===undefined||sp.usesLeft>0))));
    if(!hasUsable){ setHint('使用できる魔法がありません。自動でターンを終了します...'); setTimeout(()=>{ if(G.phase==='player') playerPass(); },500); }
    else setHint('あと'+G.actionsLeft+'回行動できます');
  }
}
