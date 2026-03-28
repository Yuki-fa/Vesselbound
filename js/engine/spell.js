// ═══════════════════════════════════════
// spell.js — 魔法使用ロジック
// 依存: constants.js, state.js, battle.js, render.js, summon.js
// ═══════════════════════════════════════

let _tgtCtx=null;
let _swapFirst=-1;
let _spreadTargetPending=false;

function useSpell(idx){
  const sp=G.spells[idx];
  if(!sp) return;
  if(sp.type==='wand'&&(G.actionsLeft<=0||sp.usesLeft<=0)) return; // チャージ切れ or 行動権なし
  if(sp.effect==='swap_pos'){ startSwapPick(idx); return; }
  if(sp.needsAlly) pickTarget('ally',idx);
  else if(sp.needsEnemy) pickTarget('enemy',idx,true); // 加護チェックあり
  else if(sp.needsAny) pickTargetAny(idx);
  else applySpell(sp,idx,null);
}

// 転移の杖：2体選択UI
function startSwapPick(idx){
  _swapFirst=-1;
  setHint('入れ替える1体目を選択（ESCでキャンセル）');
  document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
    if(G.allies[i]&&G.allies[i].hp>0){
      slot.classList.add('selectable');
      slot.onclick=()=>{
        clearSelectable();
        _swapFirst=i;
        setHint(`${G.allies[i].name}を選択。2体目を選択（ESCでキャンセル）`);
        document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot2,j)=>{
          if(G.allies[j]&&G.allies[j].hp>0&&j!==i){
            slot2.classList.add('selectable');
            slot2.onclick=()=>{
              clearSelectable();
              applySpell(G.spells[idx],idx,{who:'pair',idx1:_swapFirst,idx2:j});
              _swapFirst=-1;
            };
          }
        });
        document.addEventListener('keydown',escCancel,{once:true});
      };
    }
  });
  document.addEventListener('keydown',escCancel,{once:true});
}

// 任意キャラクター選択（needsAny）
function pickTargetAny(idx){
  _tgtCtx={who:'any',idx};
  setHint('対象を選択（ESCでキャンセル）');
  // 味方
  document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
    if(G.allies[i]&&G.allies[i].hp>0){
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'ally',idx:i}); };
    }
  });
  // 敵
  document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
    if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'enemy',idx:i}); };
    }
  });
  document.addEventListener('keydown',escCancel,{once:true});
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
        slot.classList.add('bless-blocked'); // グレーアウト表示
        return;
      }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who,idx:i}); };
    }
  });
  document.addEventListener('keydown',escCancel,{once:true});
}

function escCancel(e){ if(e.key==='Escape'){ clearSelectable(); renderHand(); setHint('杖を使うかパスしてください'); } }

// 拡散の杖：対象選択が必要な右隣杖のためのピッカー
function _pickForSpread(rw,rightIdx){
  setHint(`拡散：${rw.name}の対象を選択（ESCでキャンセル）`);
  const applyFn=tgt=>applySpell(rw,rightIdx,tgt);
  if(rw.needsAny){
    document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.allies[i]&&G.allies[i].hp>0){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'ally',idx:i}); }; }
    });
    document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'enemy',idx:i}); }; }
    });
  } else if(rw.needsEnemy){
    document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
      const u=G.enemies[i]; if(!u||u.hp<=0||slot.classList.contains('has-move')) return;
      if(u.keywords&&u.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'enemy',idx:i}); };
    });
  } else if(rw.needsAlly){
    document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.allies[i]&&G.allies[i].hp>0){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'ally',idx:i}); }; }
    });
  }
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ clearSelectable(); _spreadTargetPending=false; renderHand(); setHint('杖を使うかパスしてください'); } },{once:true});
}

function clearSelectable(){
  document.querySelectorAll('.selectable').forEach(s=>{ s.classList.remove('selectable'); s.onclick=null; });
  document.querySelectorAll('.bless-blocked').forEach(s=>s.classList.remove('bless-blocked'));
}

function applySpell(sp,idx,tgt){
  clearSelectable();
  log(`→ ${sp.name} を使用`,'em');

  // 触媒の指輪：杖の効果が2倍
  const catRingC=G.rings.find(r=>r&&r.unique==='catalyst_ring');
  const cMult=(sp.type==='wand'&&catRingC)?2:1;
  _spreadTargetPending=false;
  let _spreadPick=null;
  switch(sp.effect){
    case 'fire':{
      const e=G.enemies[tgt.idx]; const fd=G.magicLevel||1; dealDmgToEnemy(e,fd,tgt.idx); log(`炎の杖：${e.name}に${fd}ダメ`,'good');
    break;}
    case 'hate':{
      if(tgt.who==='ally'){
        G.allies.forEach(a=>{ if(a) a.hate=false; });
        const a=G.allies[tgt.idx];
        if(a){ a.hate=true; a.hateTurns=99; log(`${a.name}にヘイト付与（敵が優先的に狙う）`,'good'); }
      } else {
        G.enemies.forEach(e=>{ if(e) e.allyTarget=false; });
        const e=G.enemies[tgt.idx];
        if(e){ e.allyTarget=true; log(`${e.name}を強制ターゲットに設定（味方が優先的に狙う）`,'good'); }
      }
    break;}
    case 'double_hp':{ const a=G.allies[tgt.idx]; a.hp*=2; a.maxHp*=2; log(`${a.name} HP×2→${a.hp}`,'good'); break;}
    case 'swap_all':{
      // 死亡ユニットを除いてATK/HP入れ替え
      [...G.allies,...G.enemies].forEach(u=>{
        if(!u||u.hp<=0) return;
        const t=u.atk; u.atk=u.hp; u.hp=Math.max(1,t); u.maxHp=Math.max(u.maxHp,u.hp);
      });
      // 入れ替え後に狼オーラを再付与
      G.rings.forEach(r=>{
        if(!r||r.unique!=='wolf_aura') return;
        if(G.allies.some(a=>a&&a.hp>0&&a.ringId===r.id)){
          const bonus=r.grade||1;
          G.allies.forEach(a=>{ if(a&&a.hp>0) a.atk+=bonus; });
        }
      });
      log('全キャラATK/HP入れ替え','sys');
    break;}
    case 'nullify':{ const nu=G.enemies[tgt.idx]; nu.nullified=1; log(`${nu.name} 沈黙1T`,'good'); break;}
    case 'weaken':{
      const wu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(wu){ wu.nullified=1; log(`${wu.name} 脱力1T（ATK→0）`,'good'); }
    break;}
    case 'stealth':{ const sa=G.allies[tgt.idx]; if(sa){ sa.stealth=true; log(`${sa.name}に隠密付与`,'good'); } break;}
    case 'poison_wand':{ const pe=G.enemies[tgt.idx]; if(pe){ pe.poison=(pe.poison||0)+3; log(`${pe.name}に毒+3付与（毒${pe.poison}）`,'good'); } break;}
    case 'sacrifice':{
      const si=tgt.idx;
      const sa2=G.allies[si]; if(!sa2) break;
      const dmg=sa2.atk;
      G.allies[si]=null;
      log(`犠牲：${sa2.name}を破壊、全敵に${dmg}ダメ`,'good');
      G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dmg,ei); });
    break;}
    case 'boost_atk':{ const ba=G.allies[tgt.idx]; if(ba){ ba.atk+=3; ba.baseAtk+=3; log(`${ba.name}：ATK+3`,'good'); } break;}
    case 'swap_pos':{
      if(!tgt||tgt.who!=='pair') break;
      const {idx1,idx2}=tgt;
      const tmp=G.allies[idx1]; G.allies[idx1]=G.allies[idx2]; G.allies[idx2]=tmp;
      log(`転移：スロット${idx1+1}↔${idx2+1}を入れ替え`,'good');
    break;}
    case 'meteor_multi':{
      const hits=3;
      for(let h=0;h<hits;h++){
        const all=[...G.allies.map((a,i)=>a&&a.hp>0?{u:a,team:'ally',i}:null).filter(Boolean),
                   ...G.enemies.map((e,i)=>e&&e.hp>0?{u:e,team:'enemy',i}:null).filter(Boolean)];
        if(!all.length) break;
        const pick=randFrom(all);
        if(pick.team==='enemy') dealDmgToEnemy(pick.u,3,pick.i);
        else { pick.u.hp=Math.max(0,pick.u.hp-3); if(pick.u.hp<=0) processAllyDeath(pick.u,pick.i); }
      }
      log(`隕石の杖：ランダムキャラに3ダメ×${hits}`,'bad');
    break;}
    case 'doom':{ const dd=G.magicLevel||1; G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dd,ei); }); log(`破滅の杖：全敵に${dd}ダメ`,'good'); break;}
    case 'possess':{
      const pi=tgt.idx;
      const pa=G.allies[pi]; if(!pa) break;
      const liveE=G.enemies.map((e,i)=>({e,i})).filter(x=>x.e&&x.e.hp>0);
      if(!liveE.length) break;
      const weakE=liveE.reduce((m,x)=>x.e.atk<m.e.atk?x:m,liveE[0]);
      const ei=weakE.i;
      // チーム間で入れ替え：味方→敵陣、敵→味方陣
      G.allies[pi]=weakE.e;
      G.enemies[ei]=pa;
      log(`憑依：${pa.name}(${pi+1})⟺${weakE.e.name}(${ei+1})`,'good');
    break;}
    case 'battle_start_book':{ log('開幕の書：戦闘開始時効果を発動','good'); onBattleStart(); break;}
    case 'magic_book':{ G.magicLevel=(G.magicLevel||0)+2*cMult; log(`魔術の書：魔術レベル+${2*cMult}（現在${G.magicLevel}）`,'good'); break;}
    case 'sacrifice_doll':{
      if(!tgt) break;
      const sdu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(!sdu) break;
      if(tgt.who==='enemy'){
        if(sdu.boss){ log('生贄人形：ボスには効果がない','sys'); break; }
        sdu.hp=0; processEnemyDeath(sdu,tgt.idx); // シールド無視
      } else G.allies[tgt.idx]=null;
      log(`生贄人形：${sdu.name}を破壊`,'good');
    break;}
    case 'swap_stats':{
      if(!tgt) break;
      const ssu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(!ssu) break;
      const sst=ssu.atk; ssu.atk=ssu.hp; ssu.hp=Math.max(1,sst); ssu.maxHp=Math.max(ssu.maxHp,ssu.hp);
      log(`黒い薬瓶：${ssu.name} ATK↔HP（${ssu.atk}/${ssu.hp}）`,'good');
    break;}
    case 'counter_scroll':{
      const csa=G.allies[tgt.idx];
      if(csa){ csa.counter=true; log(`無力化の巻物：${csa.name}に反撃付与`,'good'); }
    break;}
    case 'regen_grant':{
      const rga=G.allies[tgt.idx];
      if(rga){ rga.regen=3; log(`アンデッドの秘宝：${rga.name}に再生3付与`,'good'); }
    break;}
    case 'purify_hate':{
      if(!tgt) break;
      const phu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(phu){ phu.hate=false; phu.hateTurns=0; log(`浄化の炎：${phu.name}のヘイト解除`,'good'); }
    break;}
    case 'boost':{ const a=G.allies[tgt.idx]; const bv=G.magicLevel||1; a.atk+=bv; a.baseAtk=(a.baseAtk||0)+bv; log(`${a.name}：ATK+${bv}`,'good'); break;}
    case 'rally':{ G.allies.forEach(a=>{ if(a&&a.hp>0) a.atk=Math.round(a.atk*1.2); }); log('全仲間ATK×1.2','good'); break;}
    case 'heal_ally':{ G.allies.forEach(a=>{ if(a&&a.hp>0) a.hp=a.maxHp; }); log('全仲間HP全回復','good'); break;}
    case 'seal':{ G.enemies[tgt.idx].sealed=1; log(`${G.enemies[tgt.idx].name} 封印1T`,'good'); break;}
    case 'spread':{
      const rightIdx=idx+1;
      const rw=(rightIdx<(G.handSlots||7))?G.spells[rightIdx]:null;
      if(rw&&rw.type==='wand'&&(rw.usesLeft===undefined||rw.usesLeft>0)){
        log(`拡散：${rw.name}を発動`,'sys');
        if(!rw.needsEnemy&&!rw.needsAlly&&!rw.needsAny){
          G.actionsLeft++; // 内部呼出のデクリメントを補償
          applySpell(rw,rightIdx,null);
        } else {
          // 対象選択が必要な場合：renderAll後にピッカーを起動
          _spreadTargetPending=true;
          _spreadPick=()=>_pickForSpread(rw,rightIdx);
        }
      } else {
        log('拡散：右隣に有効な杖がない','sys');
      }
    break;}
    case 'instakill':{
      if(tgt){
        const iku=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
        if(iku&&iku.hp>0){
          if(!iku.keywords) iku.keywords=[];
          if(!iku.keywords.includes('即死')) iku.keywords.push('即死');
          log(`即死の薬瓶：${iku.name}に即死を付与`,'good');
        }
      }
    break;}
    case 'golem':{
      if(G.allies.filter(a=>a&&a.hp>0).length<6){
        const gl=G.magicLevel||1;
        const golem={id:uid(),name:'ゴーレム',icon:'🗼',atk:gl,baseAtk:gl,hp:gl,maxHp:gl,
          ringId:'w_golem',ringIdx:-1,hate:false,hateTurns:0,instadead:false,sealed:0,nullified:0,
          enchants:[],regen:false,regenUsed:false,onDeath:undefined,onHit:undefined,
          taunt50:false,guardian:false,unique:undefined,keywords:[],poison:0,shield:0,_dp:false};
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot>=0) G.allies[emptySlot]=golem;
        else if(G.allies.length<6) G.allies.push(golem);
        log(`🗼 ゴーレム（${gl}/${gl}）を召喚`,'good');
      }
    break;}
    case 'meteor':{
      G.enemies.forEach((e,i)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,1,i); });
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp=Math.max(0,a.hp-1); } });
      log('☄ 隕石の杖：全キャラに1ダメ','bad');
    break;}
    case 'bomb':{ const dmg=(G.enemies[0]?.grade||1)*5*cMult; G.enemies.forEach((e,i)=>{ if(e.hp>0) dealDmgToEnemy(e,dmg,i); }); log(`全体爆弾 全敵に${dmg}ダメ`+(cMult>1?' [×2]':''),'bad'); break;}
    case 'revive':{ if(G.lastDead){ const c=clone(G.lastDead); c.hp=Math.min(Math.floor(c.maxHp*.5*cMult),c.maxHp); c.id=uid(); const s=G.allies.findIndex(a=>!a||a.hp<=0); if(s>=0) G.allies[s]=c; else if(G.allies.length<6) G.allies.push(c); log(`${c.name} 復活！`+(cMult>1?' [HP×2]':''),'good'); } else log('復活対象なし'); break;}
    case 'big_rally':{ const rbonus=5*cMult; G.allies.forEach(a=>{ if(a&&a.hp>0){ a.maxHp+=rbonus; a.hp+=rbonus; } }); log(`鼓舞の旗：全仲間HP+${rbonus}！`+(cMult>1?' [×2]':''),'good'); break;}
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
      if(G.spells.filter(s=>s).length>=(G.handSlots||7)){ log('手札が満杯','bad'); break; }
      const picked=randFrom(G.commanderWands);
      const pw=clone(SPELL_POOL.find(s=>s.effect===picked.playerEffect)||{id:picked.id,name:picked.name,type:'wand',effect:picked.playerEffect,baseUses:3});
      pw.usesLeft=pw.baseUses||3; pw._maxUses=pw.usesLeft;
      for(let j=0;j<(G.handSlots||7);j++){ if(!G.spells[j]){ G.spells[j]=pw; break; } }
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

  // 杖使用トリガー
  if(sp.type==='wand'){ onSpellUsed(); onWandUsed(); }

  // 使用回数管理
  if(sp.type==='wand'){
    if(sp.usesLeft===undefined) sp.usesLeft=1; // fallback
    const manaCycle=G.rings.find(r=>r&&r.unique==='mana_cycle');
    let skipDecrement=false;
    if(manaCycle&&!G._manaCycleUsed){ G._manaCycleUsed=true; skipDecrement=true; log(`魔導の指輪：最初の杖のチャージ消費をスキップ`,'sys'); }
    if(!skipDecrement){
      if(sp.effect!=='spread') sp.usesLeft--;
      if(sp.usesLeft<=0){ log(`${sp.name}のチャージが切れた`,'sys'); G.spells[idx]=null; }
    }
  }

  if(sp.type!=='consumable'&&!_spreadTargetPending) G.actionsLeft--;
  renderAll();
  if(checkInstantVictory()) return;
  if(_spreadPick){ _spreadPick(); return; } // 拡散対象選択：renderAll後にピッカー起動
  const hasConsumable=G.spells.some(s=>s&&s.type==='consumable');
  const hasWand=G.spells.some(s=>s&&s.type==='wand'&&(s.usesLeft===undefined||s.usesLeft>0));
  if(G.actionsLeft<=0&&!hasConsumable){
    setHint('行動終了。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else if(!hasWand&&!hasConsumable){
    setHint('使用できる魔法がありません。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else if(G.actionsLeft<=0){
    setHint('アイテムを使うかパスしてください');
  } else {
    setHint('あと'+G.actionsLeft+'回行動できます');
  }
}
