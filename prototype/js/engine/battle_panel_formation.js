// battle_panel_formation.js — 魔導板の接続・強化・配置から召喚と開戦効果へのPvE接続
// 2026-10-25 リファクタリング：battle.js から移した（処理は変えていない）。

// ラミア：攻撃：対象のキャラクターの攻撃力がこのキャラクターより低い場合、そのキャラクターを仲間にする。
// ラミアで一時的に仲間にしたキャラクターを、報酬フェイズ突入時・敗北時に取り除く
function _removeLamiaCapturedUnits(){
  if(!Array.isArray(G.allies)) return;
  G.allies.splice(0,G.allies.length,...G.allies.map(a=>a&&a._lamiaCaptured?null:a));
}


function _panelGridPos(idx){
  const cols=(typeof MAIN_BOARD_COLS!=='undefined'&&MAIN_BOARD_COLS)||5;
  return {x:idx%cols,y:Math.floor(idx/cols)};
}

function _isAdjacentPanelSlot(a,b){
  const pa=_panelGridPos(a), pb=_panelGridPos(b);
  return Math.abs(pa.x-pb.x)+Math.abs(pa.y-pb.y)===1;
}


function _isEnhancementPanel(panel){
  const c=String(panel?.category||'');
  return c==='強化'||c==='エンチャント';
}

function _isCharacterPanel(panel){
  return String(panel?.category||'')==='キャラクター';
}

function _mapPanelPowerAt(idx){
  if(typeof mapPanelPowerIdAt==='function') return mapPanelPowerIdAt(idx);
  const explicit=String(G&&G.mapPanelPowers&&G.mapPanelPowers[idx]||'');
  if(explicit) return explicit;
  return (typeof MAIN_BOARD_DEPLOY_SLOTS!=='undefined'&&MAIN_BOARD_DEPLOY_SLOTS.includes(idx))?'summon':'';
}

function _isEnhancementConnectorPanel(panel){
  return _isEnhancementPanel(panel);
}

function _directionFromPanelToSlot(panelIdx, targetIdx){
  const p=_panelGridPos(panelIdx), t=_panelGridPos(targetIdx);
  const dx=t.x-p.x, dy=t.y-p.y;
  if(dx===0&&dy===-1) return 'up';
  if(dx===1&&dy===0) return 'right';
  if(dx===0&&dy===1) return 'down';
  if(dx===-1&&dy===0) return 'left';
  return '';
}

function _panelAllowsDirection(panel, dir){
  if(!_isEnhancementPanel(panel)&&!_isCharacterPanel(panel)) return false;
  if(!Array.isArray(panel.directions)||!panel.directions.length) return false;
  return panel.directions.includes(dir);
}


// 強化カードの各矢印について、実際に「つながっている」状態か（矢印を消してunite画像を表示すべきか）を判定する。
// 「つながっている」＝①矢印の先が本体(idx0)または召喚キャラクターパネルである（直接）、
// または②矢印の先が別の強化カードで、その強化カード側の矢印もこちらを向いている（相互）。
const _PANEL_DIR_DELTA={up:{dx:0,dy:-1},right:{dx:1,dy:0},down:{dx:0,dy:1},left:{dx:-1,dy:0}};
function _panelDirectionConnectivity(unit, idx){
  const connectivity={};
  const eq=Array.isArray(unit?.boardCards)?unit.boardCards:[];
  const panel=eq[idx];
  if(!panel||!Array.isArray(panel.directions)) return connectivity;
  const pos=_panelGridPos(idx);
  panel.directions.forEach(d=>{
    const delta=_PANEL_DIR_DELTA[d];
    if(!delta){ connectivity[d]='open'; return; }
    const targetPos={x:pos.x+delta.dx,y:pos.y+delta.dy};
    let targetIdx=-1;
    for(let i=0;i<eq.length;i++){
      const p=_panelGridPos(i);
      if(p.x===targetPos.x&&p.y===targetPos.y){ targetIdx=i; break; }
    }
    if(targetIdx<0){ connectivity[d]='open'; return; }
    const targetPanel=eq[targetIdx];
    if(targetPanel&&_isCharacterPanel(targetPanel)){
      const backDir=_directionFromPanelToSlot(targetIdx,idx);
      connectivity[d]=_panelAllowsDirection(targetPanel,backDir)?'connected':'open';
      return;
    }
    if(targetPanel&&_isEnhancementPanel(targetPanel)){
      const backDir=_directionFromPanelToSlot(targetIdx,idx);
      connectivity[d]=_panelAllowsDirection(targetPanel,backDir)?'connected':'open';
      return;
    }
    connectivity[d]='open';
  });
  return connectivity;
}

// 強化の連結ルール：
// ①キャラクターに隣接し、矢印がキャラクターを向いている強化カード（直接接続）
// ②①の強化カードに隣接し、かつ矢印が互いを向いている（相互）強化カード
// ※②以降も相互矢印が続く限り連鎖する
function _collectEnhancementPanelsForSlot(unit, slotIdx){
  const panels=Array.isArray(unit?.boardCards)?unit.boardCards:[];
  const result=[];
  const seen=new Set();
  const queue=[];
  panels.forEach((panel,idx)=>{
    if(idx===slotIdx||!panel||!_isEnhancementConnectorPanel(panel)) return;
    if(!_isAdjacentPanelSlot(slotIdx,idx)) return;
    if(!_panelAllowsDirection(panel,_directionFromPanelToSlot(idx,slotIdx))) return;
    if(!_panelAllowsDirection(panels[slotIdx],_directionFromPanelToSlot(slotIdx,idx))) return;
    seen.add(idx);
    queue.push(idx);
    result.push({panel,idx});
  });
  while(queue.length){
    const idx=queue.shift();
    const panel=panels[idx];
    panels.forEach((next,nIdx)=>{
      if(seen.has(nIdx)||nIdx===slotIdx||!next||!_isEnhancementConnectorPanel(next)) return;
      if(!_isAdjacentPanelSlot(idx,nIdx)) return;
      const mutual=_panelAllowsDirection(panel,_directionFromPanelToSlot(idx,nIdx))&&
        _panelAllowsDirection(next,_directionFromPanelToSlot(nIdx,idx));
      if(!mutual) return;
      seen.add(nIdx);
      queue.push(nIdx);
      result.push({panel:next,idx:nIdx});
    });
  }
  return result.map(entry=>({...entry,panel:runLevelDisplayCard(entry.panel,unit)}));
}

function _collectAdjacentEnhancements(unit, slotIdx, stageNumber){
  const enh={atk:0,hp:0,keywords:[],abilities:[],strategyCount:0,strategyMultiplier:0,weakenOnHit:0,manaOnAttack:0,manaOnInjury:0,manaOnDeath:0,goldOnBattleEnd:0,goldOnDeath:0,randomItemOnBattleEnd:false,randomItemCost:0,effectRepeatBonus:0,uniteGroups:[],manaThresholds:[],effectNames:[],effectScales:{},effectTexts:[],permanentEffectCards:[],releaseAtkBonus:0,releaseHpBonus:0,engravingStages:{}};
  const panels=_collectEnhancementPanelsForSlot(unit,slotIdx);
  _recordBattleTrace('adjacent_enhancements_resolved',{slotIdx,unitId:unit&&unit.id||null,names:panels.map(x=>x&&x.panel&&x.panel.name||''),indices:panels.map(x=>x&&x.idx)});
  // ※以前は「複製」を**接続している他の強化カードに置き換える**特別扱いがあった
  //   （旧試作版の「常時：接続している強化カードに変化する。」）。
  //   現行シートの「複製」は開戦：自分のコピーを召喚する別のカードなので、
  //   置き換えると**他の強化を1枚でも付けた瞬間に複製の効果が消える**。
  //   カード固有の特別扱いをここへ書き足さないこと（効果は本文から読む）。
  panels.forEach(entry=>{
    const panel=entry.panel;
    if(!panel) return;
    if(panel.desc){
      const effectIndex=enh.effectTexts.length;
      enh.effectTexts.push(String(panel.desc));
      const damage=corePermanentDamageValue(panel);
      if(damage!=null) enh.permanentEffectCards.push({effectIndex,cardId:String(panel.id),boardSlot:entry.idx,damage});
    }
    // 2026-10-12: 合体の表示名を共通コアの効果識別子へ正規化する。
    if(/このキャラクターが受けたダメージ(?:の半分)?は、このエンチャントが接続している全ての味方に分散される/.test(String(panel.desc||''))) enh.uniteGroups.push(String(entry.idx));
    // 強化カード名は、効果文に名前が書かれていないトリガ効果の識別子になる。
    // 例：「逆上」「執念の炎」「恩寵」など。合体枚数もスケールへ反映する。
    if(panel.name && String(panel.category || '') !== 'キャラクター') {
      const name=coreEffectKey(panel.name);
      // **合体後の本文がシートから入っているなら、強さは本文が表している。**
      // そこへさらに「2枚分」を掛けると二重に強くなる
      // （咆哮+＝「ATKを3倍にする」が、2枚分×3倍で9倍になっていた）。
      // 合体効果の列が空欄のカードだけが、従来どおり枚数で強くなる。
      const copies=(panel._tripleMerged&&!panel._mergedFormApplied?2:1)
        +(Number(panel._effectRepeatBonus||panel.effectRepeatBonus)||0);
      for(let i=0;i<copies;i++) enh.effectNames.push(name);
      enh.effectScales[name]=Math.max(enh.effectScales[name]||1,copies);
    }
    // 同じ接続カードにつながる体だけを渡す。効果の条件・倍率はコアが決める。
    const connectedCharacters=coreConnectedColorStatMultiplier(panel)==null?[]:
      (unit.boardCards||[]).filter((card,idx)=>card&&idx!==slotIdx&&String(card.category||'')==='キャラクター'
        &&_collectEnhancementPanelsForSlot(unit,idx).some(link=>link.idx===entry.idx));
    const stats=corePanelStatBonuses(panel,{stageNumber:stageNumber
      ||Number(typeof G!=='undefined'&&G&&G._wave)||1,
      character:(unit.boardCards||[])[slotIdx],connectedCharacters});
    enh.atk+=stats.atk;
    enh.hp+=stats.hp;
    enh.releaseAtkBonus=Math.max(enh.releaseAtkBonus,Number(panel.releaseAtkBonus)||0);
    enh.releaseHpBonus=Math.max(enh.releaseHpBonus,Number(panel.releaseHpBonus)||0);
    enh.manaOnAttack+=panel.manaOnAttack||0;
    enh.manaOnInjury+=panel.manaOnInjury||0;
    enh.manaOnDeath+=panel.manaOnDeath||0;
    enh.goldOnBattleEnd+=panel.goldOnBattleEnd||0;
    enh.goldOnDeath+=panel.goldOnDeath||0;
    enh.randomItemOnBattleEnd=enh.randomItemOnBattleEnd||!!panel.randomItemOnBattleEnd||/終戦：.*ランダムなアイテムを得る/.test(String(panel.desc||''));
    const itemCost=String(panel.desc||'').match(/終戦：\s*(\d+)Gと引き換えに、ランダムなアイテムを得る/);
    if(itemCost) enh.randomItemCost=Math.max(enh.randomItemCost||0,Number(itemCost[1])||0);
    const deathMana=String(panel.desc||'').match(/死亡：\s*(\d+)マナを?得る/);
    if(deathMana) enh.manaOnDeath+=Number(deathMana[1])||0;
    const deathGold=String(panel.desc||'').match(/死亡：\s*(\d+)ゴールドを?得る/);
    if(deathGold) enh.goldOnDeath+=Number(deathGold[1])||0;
    const battleGold=String(panel.desc||'').match(/終戦：\s*(\d+)ゴールドを?得る/);
    if(battleGold) enh.goldOnBattleEnd+=Number(battleGold[1])||0;
    enh.effectRepeatBonus+=Number(panel.effectRepeatBonus||panel._effectRepeatBonus)||0;
    if(panel.manaCost){
      // no：その効果の固有VFX（活性化＝E045等）を引くためのカードNo.。
      // ここで落とすと、演出側は「どの効果が発動したのか」を知る手段が無くなる。
      enh.manaThresholds.push({cost:Number(panel.manaCost)||0,repeat:!!panel.manaRepeat,
        // 演出の番号はシートの「VFX/SE」列が最優先（無ければカードのNo.）。
        no:String(panel.fxCode||panel.no||panel.artCode||'').toUpperCase(),
        // order：シートの「マナ順位」。落とすと発動順が指定どおりにならない。
        order:Number(panel.manaOrder),
        desc:coreCardManaThresholdDesc(panel)});
    }
    if(panel._resonanceEffectName && panel._resonanceEffectName!==panel.name){
      enh.effectNames.push(panel._resonanceEffectName);
      enh.effectScales[panel._resonanceEffectName]=Math.max(enh.effectScales[panel._resonanceEffectName]||1,panel._tripleMerged?2:1);
    }
    // **カード名がそのまま能力になる強化の一覧はコアが持つ**（CORE_KEYWORD_CARD_NAMES）。
    // ここに別の一覧を書くと片方だけ取り残される（攻防一体が抜けていて機能していなかった）。
    const keywordPanels=new Set([...CORE_KEYWORD_CARD_NAMES,'防戦']);
    // 「刻印」はそのカード自身の性質なので、接続したキャラへは付けない。
    const panelKeywords=[...(panel.adjacentKeywords||[])].filter(k=>String(k||'').trim()!=='刻印');
    if(keywordPanels.has(coreEffectKey(panel.name))&&!enh.abilities.includes(coreEffectKey(panel.name))) enh.abilities.push(coreEffectKey(panel.name));
    // 策士は倍率を本文から読む（基本2倍／合体3倍）。合体後の本文が入っているなら
    // 枚数で二重に強くしない（上の copies と同じ理由）。
    if(/キーワードの数の\d+倍に等しい/.test(String(panel.desc||''))){
      const m=/キーワードの数の(\d+)倍に等しい/.exec(String(panel.desc||''));
      enh.strategyMultiplier=Math.max(enh.strategyMultiplier||0,m?(parseInt(m[1],10)||2):2);
      enh.strategyCount+=(panel._tripleMerged&&!panel._mergedFormApplied?2:1);
    }
    if(coreEffectKey(panel.name)==='封印されしもの'&&!panelKeywords.some(k=>/^封印\d+$/.test(String(k||'')))) panelKeywords.push('封印1');
    // 我慢の刻印＝封印X（X＝現在のステージ×5）。接続したキャラのキーワードとして付け、血アイコンにも出す（2026-10-02 利用者指摘）。
    // 戦闘の coreSealValue は、このキーワードがあれば我慢の刻印の分を二重には足さない。
    // 刻印のXは**取得した時のステージで固定**（カードの _engravingStage。2026-10-05 利用者指定）。
    // 記録の無い古いカードだけ現在のステージで数える。
    const engravingStage=typeof engravingCardStage==='function'?engravingCardStage(panel):0;
    if(engravingStage) enh.engravingStages[String(panel.name||'')]=engravingStage;
    if(String(panel.name||'')==='我慢の刻印'){
      const stage=engravingStage||Math.max(1,Math.floor(Number(typeof G!=='undefined'&&G&&G._wave)||1));
      panelKeywords.push(`封印${stage*5}`);
    }
    panelKeywords.forEach(k=>{
      enh.effectScales[k]=Math.max(enh.effectScales[k]||1,panel._tripleMerged?2:1);
      // 衝撃X：このキャラクター自身が弱体化するのではなく、攻撃/ダメージ効果で
      // 対象に衝撃Xを付与する常時能力として扱う。表示上はキーワードとしても残す。
      const wm=/^衝撃(\d+)$/.exec(k);
      if(wm){
        enh.weakenOnHit+=parseInt(wm[1],10)||0;
        enh.keywords.push(k);
        return;
      }
      enh.keywords.push(k);
    });
  });
  // 策士：所持キーワード1つにつき+X/+X（Xは本文の倍率。基本2／合体3）。
  // **加算量はここだけで決め、説明文（render.js の _groupedEnchantEffectTexts）は enh.strategyBonus を出すだけ。**
  // 以前は説明側にも数え方があり、戦闘と説明で数値が食い違っていた。
  enh.strategyBonus=0;
  if(enh.strategyCount>0){
    // 第1引数は盤面の持ち主（boardCards＝盤面）。キャラ本体のキーワードは、そのマスのカードから読む。
    // 持ち主自身を読むとキャラのキーワードが数えられない（策士が強化カード分しか効かなかった）。
    const slotCard=Array.isArray(unit&&unit.boardCards)?unit.boardCards[slotIdx]:null;
    const character=slotCard&&String(slotCard.category||'')==='キャラクター'?slotCard:unit;
    const ownKeywords=typeof _unitPanelKeywords==='function'?_unitPanelKeywords(character):(character&&character.keywords||[]);
    // 2026-10-12: 能力値の計算は共通コアへ。各接続カードの本文の倍率を加算する。
    enh.strategyBonus=coreKeywordCountBuff([...(ownKeywords||[]),...(enh.keywords||[]),...(enh.abilities||[])],
      panels.map(entry=>entry.panel));
    enh.atk+=enh.strategyBonus;
    enh.hp+=enh.strategyBonus;
  }
  return enh;
}


function _clearAdjacentPanelEnhancements(unit){
  const prev=unit?._adjacentPanelEnhancements;
  if(!unit||!prev) return;
  if(prev.atk){
    unit.atk=Math.max(0,(unit.atk||0)-prev.atk);
    unit.baseAtk=Math.max(0,(unit.baseAtk||0)-prev.atk);
  }
  if(prev.hp){
    unit.maxHp=Math.max(0,(unit.maxHp||0)-prev.hp);
    unit.hp=Math.max(0,Math.min((unit.hp||0)-prev.hp,unit.maxHp));
  }
  if(prev.keywords&&prev.keywords.length){
    const removeCounts={};
    prev.keywords.forEach(k=>{ removeCounts[k]=(removeCounts[k]||0)+1; });
    unit.keywords=(unit.keywords||[]).filter(k=>{
      if(removeCounts[k]>0){ removeCounts[k]--; return false; }
      return true;
    });
  }
  if(prev.weakenOnHit){
    unit.weakenOnHit=Math.max(0,(unit.weakenOnHit||0)-prev.weakenOnHit);
  }
  if(prev.manaOnAttack){
    unit.manaOnAttack=Math.max(0,(unit.manaOnAttack||0)-prev.manaOnAttack);
  }
  if(prev.manaOnInjury){
    unit.manaOnInjury=Math.max(0,(unit.manaOnInjury||0)-prev.manaOnInjury);
  }
  if(prev.manaOnDeath){
    unit.manaOnDeath=Math.max(0,(unit.manaOnDeath||0)-prev.manaOnDeath);
  }
  if(prev.goldOnBattleEnd){
    unit.goldOnBattleEnd=Math.max(0,(unit.goldOnBattleEnd||0)-prev.goldOnBattleEnd);
  }
  if(prev.goldOnDeath){
    unit.goldOnDeath=Math.max(0,(unit.goldOnDeath||0)-prev.goldOnDeath);
  }
  if(prev.randomItemOnBattleEnd) unit.randomItemOnBattleEnd=false;
  if(prev.randomItemCost) unit.randomItemCost=Math.max(0,(unit.randomItemCost||0)-prev.randomItemCost);
  if(prev.effectRepeatBonus){
    unit._effectRepeatBonus=Math.max(0,(unit._effectRepeatBonus||0)-prev.effectRepeatBonus);
  }
  unit._releaseAtkBonus=0;
  unit._releaseHpBonus=0;
  delete unit._adjacentPanelEnhancements;
  delete unit._adjacentPanelAbilities;
  delete unit._adjacentPanelStrategyCount;
  delete unit._adjacentPanelEffectTexts;
  delete unit._permanentEffectCards;
  delete unit._uniteGroups;
  delete unit._adjacentPanelSignature;
  delete unit._resonanceEffectNames;
  delete unit._resonanceEffectScales;
  delete unit._extraManaCosts;
  delete unit._extraManaThresholds;
  if(prev.manaThresholdAdded){
    delete unit.manaCost;
    delete unit.manaRepeat;
    delete unit._manaThresholdDesc;
    delete unit._manaThresholdNo;
    delete unit._manaThresholdOrder;
    delete unit._manaFireCount;
  }
}

function _applyAdjacentPanelEnhancements(unit, enh){
  if(!unit||!enh) return;
  const cardNames=CORE_KEYWORD_CARD_NAMES;  // 一覧はコア側が持つ（2箇所で持たない）
  // 旧バージョンで混入したカード名キーワードも、再計算の有無にかかわらず除去する。
  unit.keywords=(unit.keywords||[]).filter(k=>!cardNames.has(String(k||'').trim()));
  const side=_battleSideOfUnit(unit);
  const modifierBonus=_combatModifierBonus(unit,side==='enemy');
  // 2026-10-12: 戦闘中の接続修正も共通の正負補正を使う。編成時は従来どおり素の値。
  const giver={...unit,keywords:[...(unit.keywords||[]),...(enh.keywords||[])],
    _adjacentPanelEffectTexts:enh.effectTexts||[],_voidWalkerBonus:modifierBonus};
  const atkBonus=_isBattleGainPhase()?coreStatBonus(giver,enh.atk||0,giver):(enh.atk||0)+(enh.atk>0?modifierBonus:0);
  const hpBonus=_isBattleGainPhase()?coreStatBonus(giver,enh.hp||0,giver):(enh.hp||0)+(enh.hp>0?modifierBonus:0);
  const releaseAtkBonus=Number(enh.releaseAtkBonus)||0;
  const releaseHpBonus=Number(enh.releaseHpBonus)||0;
  const enhancementKeywords=[...(enh.keywords||[])];
  if(releaseAtkBonus||releaseHpBonus){
    if(!enhancementKeywords.some(k=>/^封印\d+$/.test(String(k||'')))) enhancementKeywords.push('封印1');
  }
  const abilities=[...(enh.abilities||[])];
  const strategyCount=Number(enh.strategyCount)||0;
  const effectTexts=[...(enh.effectTexts||[])].filter(Boolean);
  const permanentEffectCards=(enh.permanentEffectCards||[]).map(record=>({...record}));
  const sig=JSON.stringify({atk:atkBonus,hp:hpBonus,keywords:[...enhancementKeywords].sort(),abilities:[...abilities].sort(),strategyCount,strategyMultiplier:enh.strategyMultiplier||0,releaseAtkBonus,releaseHpBonus,weakenOnHit:enh.weakenOnHit||0,manaOnAttack:enh.manaOnAttack||0,manaOnInjury:enh.manaOnInjury||0,manaOnDeath:enh.manaOnDeath||0,goldOnBattleEnd:enh.goldOnBattleEnd||0,goldOnDeath:enh.goldOnDeath||0,randomItemOnBattleEnd:!!enh.randomItemOnBattleEnd,randomItemCost:enh.randomItemCost||0,effectRepeatBonus:enh.effectRepeatBonus||0,uniteGroups:[...(enh.uniteGroups||[])].sort(),manaThresholds:enh.manaThresholds||[],effectNames:[...(enh.effectNames||[])].sort(),effectScales:enh.effectScales||{},effectTexts:[...effectTexts].sort()});
  if(unit._adjacentPanelSignature===sig){
    unit._permanentEffectCards=permanentEffectCards;
    return;
  }
  _clearAdjacentPanelEnhancements(unit);
  unit._adjacentPanelSignature=sig;
  unit._adjacentPanelEnhancements={atk:atkBonus,hp:hpBonus,keywords:[...enhancementKeywords],releaseAtkBonus,releaseHpBonus,weakenOnHit:enh.weakenOnHit||0,manaOnAttack:enh.manaOnAttack||0,manaOnInjury:enh.manaOnInjury||0,manaOnDeath:enh.manaOnDeath||0,goldOnBattleEnd:enh.goldOnBattleEnd||0,goldOnDeath:enh.goldOnDeath||0,randomItemOnBattleEnd:!!enh.randomItemOnBattleEnd,randomItemCost:enh.randomItemCost||0,effectRepeatBonus:enh.effectRepeatBonus||0,manaThresholdAdded:false,effectTexts};
  unit._adjacentPanelAbilities=abilities;
  unit._adjacentPanelStrategyCount=strategyCount;
  unit._releaseAtkBonus=releaseAtkBonus;
  unit._releaseHpBonus=releaseHpBonus;
  const manaThresholds=Array.isArray(enh.manaThresholds)?enh.manaThresholds.filter(t=>Number(t&&t.cost)>0):[];
  if(enh.manaThresholds&&enh.manaThresholds.length&&!unit.manaCost){
    const first=enh.manaThresholds[0];
    unit.manaCost=first.cost;
    unit.manaRepeat=first.repeat;
    unit._manaThresholdDesc=first.desc;
    unit._manaThresholdNo=String(first.no||'');
    unit._manaThresholdOrder=first.order;
    unit._adjacentPanelEnhancements.manaThresholdAdded=true;
  }
  const extraThresholds=manaThresholds.slice(unit._adjacentPanelEnhancements.manaThresholdAdded?1:0);
  unit._extraManaThresholds=extraThresholds.map(t=>({cost:Number(t.cost)||0,repeat:!!t.repeat,desc:String(t.desc||''),no:String(t.no||''),order:t.order})).filter(t=>t.cost>0);
  unit._extraManaCosts=extraThresholds.map(t=>Number(t.cost)||0).filter(Boolean);
  unit._resonanceEffectNames=[...(enh.effectNames||[])].filter(Boolean);
  unit._resonanceEffectScales={...(enh.effectScales||{})};
  unit._adjacentPanelEffectTexts=effectTexts.slice();
  unit._permanentEffectCards=permanentEffectCards;
  unit._uniteGroups=[...(enh.uniteGroups||[])];
  // 接続した刻印ごとの取得ステージ（Xの固定値。コアの coreEngravingStageNumber が使う）。
  if(enh.engravingStages&&Object.keys(enh.engravingStages).length) unit._engravingStages={...enh.engravingStages};
  else delete unit._engravingStages;
  if(atkBonus){
    // **ATKの下限は0**（HPを減らす強化と同じく、ATKを減らす強化でも負にしない）。
    unit.atk=Math.max(0,(unit.atk||0)+atkBonus);
    unit.baseAtk=Math.max(0,(unit.baseAtk||0)+atkBonus);
  }
  if(hpBonus){
    // HPを減少させる強化（adjacentHpBonusが負の値）でHPが0未満にならないようクランプする
    const nextMaxHp=Math.max(0,(unit.maxHp||0)+hpBonus);
    unit.hp=Math.max(0,Math.min((unit.hp||0)+hpBonus,nextMaxHp));
    unit.maxHp=nextMaxHp;
    // 強化でHP0になった体の印。開戦の瞳の指輪（+X/+X）で正に戻れば出撃する（コアの coreApplyOpeningRingsToUnitEarly）。
    // 印が無いと、指輪が掛かる前にHP0の体として扱われ、戦闘に出てこなかった（2026-10-05 利用者指摘：獰猛＋瞳の指輪）。
    if(unit.hp<=0) unit._deployedAtZeroHp=true; else delete unit._deployedAtZeroHp;
  }
  if(enhancementKeywords.length){
  unit.keywords=[...(unit.keywords||[]),...enhancementKeywords].filter(k=>!cardNames.has(String(k||'').trim()));
  }
  if(enh.weakenOnHit){
    unit.weakenOnHit=(unit.weakenOnHit||0)+enh.weakenOnHit;
  }
  if(enh.manaOnAttack){
    unit.manaOnAttack=(unit.manaOnAttack||0)+enh.manaOnAttack;
  }
  if(enh.manaOnInjury){
    unit.manaOnInjury=(unit.manaOnInjury||0)+enh.manaOnInjury;
  }
  if(enh.manaOnDeath) unit.manaOnDeath=(unit.manaOnDeath||0)+enh.manaOnDeath;
  if(enh.goldOnBattleEnd) unit.goldOnBattleEnd=(unit.goldOnBattleEnd||0)+enh.goldOnBattleEnd;
  if(enh.goldOnDeath) unit.goldOnDeath=(unit.goldOnDeath||0)+enh.goldOnDeath;
  if(enh.randomItemOnBattleEnd) unit.randomItemOnBattleEnd=true;
  if(enh.randomItemCost) unit.randomItemCost=Math.max(unit.randomItemCost||0,enh.randomItemCost);
  if(enh.effectRepeatBonus){
    unit._effectRepeatBonus=(unit._effectRepeatBonus||0)+enh.effectRepeatBonus;
  }
  // シールドはonBattleStart()より後に接続されるパネル召喚キャラでも、接続時点で自前で付与しておく
  const shieldValue=_unitShieldValue(unit);
  if(shieldValue>0&&(unit.shield||0)<shieldValue){
    unit.shield=shieldValue;
  }
}

function _makePanelSummonUnit(spec, keywords){
  const atk=spec.atk||0, hp=spec.hp||1;
  const mergedKeywords=[...(spec.keywords||[]),...(keywords||[])];
  return {
    id:uid(),
    ...(spec._runLevelsApplied?{_runLevelsApplied:{...spec._runLevelsApplied}}:{}),
    name:spec.name||'召喚',
    icon:spec.icon||'',
    race:spec.race||'召喚',
    desc:spec.desc||'',
    grade:1,
    atk,
    baseAtk:atk,
    hp,
    maxHp:hp,
    keywords:[...mergedKeywords],
    // シールドは通常onBattleStart()で戦闘開始時に付与されるが、パネル召喚キャラは
    // onBattleStart()より後に盤面へ現れるため、召喚時点で自前で付与しておく
    shield:coreUnitShieldValue({keywords:mergedKeywords}),
    sfxType:spec.sfxType||'',
    boardCards:[],
    _panelSummoned:true,
    summonCount:Math.max(1,Number(spec.summonCount||spec.count)||1),
    _sourcePanelName:spec.panelName||spec.name||'',
    manaOnAttack:spec.manaOnAttack||0,
    manaOnInjury:spec.manaOnInjury||0,
    manaOnDeath:spec.manaOnDeath||0,
    manaCost:spec.manaCost||0,
    manaRepeat:!!spec.manaRepeat,
    _manaThresholdDesc:spec.manaThresholdDesc||'',
    _manaThresholdNo:spec.manaThresholdNo||'',
    fxCode:spec.fxCode||'',
    _manaThresholdOrder:spec.manaThresholdOrder,
    manaOrder:spec.manaOrder,
    goldOnBattleEnd:spec.goldOnBattleEnd||0,
    goldOnDeath:spec.goldOnDeath||0,
    randomItemOnBattleEnd:!!spec.randomItemOnBattleEnd,
    randomItemCost:Number(spec.randomItemCost)||0,
    _effectRepeatBonus:Number(spec.effectRepeatBonus||spec._effectRepeatBonus)||0,
    _merged:!!spec._merged,
    _tripleMerged:!!spec._tripleMerged,
    _tripleDescApplied:!!spec._tripleDescApplied,
    color:spec.color||'',
    art:spec.art||'',
    no:spec.no||'',
    lane:'front'
  };
}

function _terrainNpcSpec(name, fallbackAtk, fallbackHp){
  const base=(typeof UNIT_POOL!=='undefined'&&Array.isArray(UNIT_POOL))
    ?UNIT_POOL.find(u=>u&&u.name===name)
    :null;
  const mapNo=Math.max(1,Number(G&&G._mapBattle&&G._mapBattle.mapIndex)||Number(G&&G._wave)||1);
  const atk=Math.max(0,Math.round(Number(base&&base.atk)||Number(fallbackAtk)||0));
  const hp=Math.max(1,Math.round(Number(base&&base.hp)||Number(fallbackHp)||1));
  return {
    name,
    atk,
    hp,
    race:(base&&base.race)||'NPC',
    // 表示文はキャラクターシートの効果文だけを使う。
    desc:(base&&base.desc)||'',
    keywords:[...(base&&base.keywords||[])],
    color:(base&&base.color)||'',
    sfxType:(base&&base.sfxType)||'',
    art:(base&&typeof getCardAsset==='function'?getCardAsset(base):'')||'',
    no:(base&&(base.no||base.imageNo||base.artCode||base._artCode))||'',
    panelName:name,
    _terrainNpc:true,
    _terrainMapNo:mapNo,
  };
}
function _placeTerrainNpcAt(slotIdx, spec){
  const max=MAX_ALLIES||14;
  if(!Number.isInteger(slotIdx)||slotIdx<0||slotIdx>=max) return null;
  G.allies=Array.isArray(G.allies)?G.allies:new Array(max).fill(null);
  while(G.allies.length<max) G.allies.push(null);
  if(G.allies[slotIdx]&&G.allies[slotIdx].hp>0&&!G.allies[slotIdx]._isObject&&!G.allies[slotIdx]._isSoul) return null;
  const unit=_makePanelSummonUnit(spec,[]);
  Object.assign(unit,coreApplyUnitRunLevels(unit,runLevelBattleValues()));
  unit._terrainNpc=true;
  unit._battleSlot=slotIdx;
  // lane は配置後の配列添字から再計算しない。地形側が指定した体の属性を使う。
  unit.lane=spec&&spec.lane==='rear'?'rear':'front';
  G.allies[slotIdx]=unit;
  return unit;
}
function _applyTerrainReinforcements(){
  const b=G&&G._mapBattle;
  if(!b||b._terrainReinforcementsApplied) return;
  b._terrainReinforcementsApplied=true;
  const terrain=String(b.terrainType||'');
  const max=MAX_ALLIES||14;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const added=[];
  if(terrain==='village'){
    const spec=_terrainNpcSpec('戦士',0,1);
    [0,frontSlots-1].forEach(slot=>{ const u=_placeTerrainNpcAt(slot,spec); if(u) added.push(u); });
  }else if(terrain==='start'){
    const spec={..._terrainNpcSpec('魔術師',0,1),lane:'rear'};
    [frontSlots,frontSlots+Math.max(0,rearSlots-1)].forEach(slot=>{ const u=_placeTerrainNpcAt(slot,spec); if(u) added.push(u); });
    const buff=Math.max(0,(Number(b.mapIndex)||Number(G._wave)||1)*2);
    if(buff>0){
      (G.allies||[]).forEach(u=>{
        if(!u||u.hp<=0||u._isObject||u._isSoul) return;
        u.atk=Math.max(0,(u.atk||0)+buff);
        u.baseAtk=Math.max(0,(u.baseAtk||0)+buff);
        addUnitHp(u,buff,'ally');
      });
    }
  }
}

function _panelSummonSpec(panel,options){
  if(!panel) return null;
  panel=runLevelBattleCard(panel,options);
  const openingSpec=panel.summonOnBattleStart&&typeof panel.summonOnBattleStart==='object'
    ?panel.summonOnBattleStart:null;
  if(_isCharacterPanel(panel)||openingSpec){
    const desc=String(panel.desc||openingSpec&&openingSpec.desc||'');
    const manaLine=desc.match(/(?:^|\n)\s*(\d+)マナ(毎)?[：:]\s*([^\n]*)/);
    return {
      ...(openingSpec||{}),
      ...(panel._runLevelsApplied?{_runLevelsApplied:{...panel._runLevelsApplied}}:{}),
      name:openingSpec&&openingSpec.name||panel.name,
      atk:Number(openingSpec?.atk??panel.power??panel.atk??0),
      hp:Number(openingSpec?.hp??panel.life??panel.hp??1),
      count:openingSpec&&openingSpec.count||panel.summonCount||1,
      race:openingSpec&&openingSpec.race||panel.race||'',
      desc,
      keywords:openingSpec&&openingSpec.keywords||panel.keywords||[],
      color:openingSpec&&openingSpec.color||panel.color||panel.カラー||'',
      sfxType:openingSpec&&openingSpec.sfxType||panel.sfxType||panel.attackSfx||panel.soundType||'',
      manaOnAttack:openingSpec&&openingSpec.manaOnAttack||panel.manaOnAttack||0,
      manaOnInjury:openingSpec&&openingSpec.manaOnInjury||panel.manaOnInjury||0,
      manaOnDeath:openingSpec&&openingSpec.manaOnDeath||panel.manaOnDeath||0,
      manaCost:Number(openingSpec&&openingSpec.manaCost||panel.manaCost||panel.costMana||(manaLine&&manaLine[1])||0),
      manaRepeat:!!(openingSpec&&openingSpec.manaRepeat)||!!panel.manaRepeat||!!(manaLine&&manaLine[2]),
      manaThresholdDesc:coreCardManaThresholdDesc(panel)||String(openingSpec&&(openingSpec.manaThresholdDesc||openingSpec._manaThresholdDesc)||''),
      manaThresholdNo:String(openingSpec&&(openingSpec.manaThresholdNo||openingSpec._manaThresholdNo)||panel.fxCode||panel.no||panel.artCode||''),
      fxCode:String(panel.fxCode||''),
      manaThresholdOrder:(openingSpec&&(openingSpec.manaThresholdOrder??openingSpec._manaThresholdOrder))??panel.manaOrder,
      manaOrder:panel.manaOrder,
      goldOnBattleEnd:openingSpec&&openingSpec.goldOnBattleEnd||panel.goldOnBattleEnd||0,
      goldOnDeath:openingSpec&&openingSpec.goldOnDeath||panel.goldOnDeath||0,
      randomItemOnBattleEnd:!!(openingSpec&&openingSpec.randomItemOnBattleEnd)||!!panel.randomItemOnBattleEnd,
      effectRepeatBonus:Number(openingSpec&&openingSpec.effectRepeatBonus||panel.effectRepeatBonus||panel._effectRepeatBonus)||0,
      _merged:!!panel._merged,
      _tripleMerged:!!panel._tripleMerged,
      _tripleDescApplied:!!panel._tripleDescApplied,
      art:typeof getPanelArtPath==='function'?getPanelArtPath(panel):(panel.art||''),
      no:panel.no||panel.artCode||panel._artCode||panel['No.']||'',
      panelName:panel.name
    };
  }
  return null;
}

// 「色」はカード自体の見た目・種族分類（茶は廃止し黄に統一、紫を追加）にのみ使う汎用キー変換。
// マナ自体は色を持たない単一プールのため、マナの支払い・獲得には使わない。
function _colorKey(color){
  const c=String(color||'').trim().toLowerCase();
  if(c==='赤'||c==='red') return 'red';
  if(c==='青'||c==='blue') return 'blue';
  if(c==='緑'||c==='green') return 'green';
  if(c==='黄'||c==='茶'||c==='yellow') return 'yellow';
  if(c==='紫'||c==='purple') return 'purple';
  return '';
}

// ── 効果によるアドホックな味方召喚（例：センチネルの「赤ゴーレム」、スケルトンキングの「青スケルトン」）──
// 色が付いた名前（例：「赤ゴーレム」）は色部分を色分類に、残りを実際のキャラクター名として扱う。
// 召喚されるキャラクターは「オリジナル」でなければならない：プレイヤーがメイン置き場に同名の
// キャラクターパネルを所持していれば、そのインスタンス（隣接する強化パネルの効果を含む）を
// そのまま召喚する。所持していない場合のみ、PANEL_POOLの基礎値＋色別永続強化にフォールバックする。
async function _spawnAdhocAllyUnit(name, atk, hp, isEnemySide, placement){
  // 旧互換の直接召喚も、共通コア経由の召喚と同じ陣営総数上限で拒否する。
  // ここを個別の配置ヘルパーだけに任せると、生成→配置失敗の一瞬だけ配列へ
  // 追加され、renderAll()で左端へ描画される経路が残る。
  const summonList=isEnemySide?(G.enemies||[]):(G.allies||[]);
  const summonMax=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const summonLiveCount=summonList.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(summonLiveCount>=summonMax){
    _recordBattleTrace('summon_rejected',{side:isEnemySide?'p2':'p1',name:String(name||''),
      liveCount:summonLiveCount,max:summonMax,reason:'summon_limit_legacy_entry'});
    return null;
  }
  const m=String(name||'').match(/^([赤青緑黄紫黒])(.+)$/);
  const color=m?m[1]:'';
  const baseName=m?m[2]:String(name||'');
  const board=!isEnemySide&&typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const eq=board&&Array.isArray(board.boardCards)?board.boardCards:[];
  const ownedIdx=eq.findIndex(p=>p&&String(p.category||'')==='キャラクター'&&p.name===baseName);
  if(ownedIdx>=0){
    const panel=eq[ownedIdx];
    const spec=typeof _panelSummonSpec==='function'?_panelSummonSpec(panel,{effectsOnly:true}):null;
    if(spec){
      const enh=typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(board,ownedIdx):{atk:0,hp:0,keywords:[]};
      const contributingPanels=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(board,ownedIdx):[];
      // enh.keywordsは直後のapplyAdjacentPanelEnhancements()側で付与するため、ここでは渡さない
      // （両方に渡すと同じキーワードが二重に加算され、逆襲・闇の儀式等のカウント依存効果が
      // 意図した回数より多く発動してしまう）
      const summonSpec={...spec,name:baseName,panelName:panel.name};
      const summoned=_makePanelSummonUnit(summonSpec,[]);
      _applyAdjacentPanelEnhancements(summoned,enh);
      summoned._mainBoardSlot=ownedIdx;
      // 寄与している強化パネルの効果全文（キーワード以外）も戦闘中の説明文に表示されるよう、
      // applyNewPanelBattleStart()と同様に複製して引き継ぐ
      if(contributingPanels.length){
        summoned.boardCards=_panelSummonDisplayBoardCards(panel,contributingPanels);
      }
      // 召喚は前衛の右端にだけ出す。前衛が満杯なら成立させない（後衛へ逃がさない）。
      // 後衛へ送ると陣営の上限を超え、編成していない後衛枠にキャラクターが現れる。
      const rearIdx=_summonMidBattleAllyFront(summoned,isEnemySide,placement);
      if(rearIdx>=0){
        await _applyLegacyBattleSummonTraits(summoned,isEnemySide,placement);
        await _afterPanelSummon(summoned,isEnemySide);
        if(!(placement&&placement.deferCompact)) requestBattleCompact();
      }
      return rearIdx>=0?summoned:null;
    }
  }
  const basePanel=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(p=>p&&p.name===baseName)
    :null;
  let finalAtk=Number(basePanel?.power??atk)||Number(atk)||0;
  let finalHp=Math.max(1,Number(basePanel?.life??hp)||Number(hp)||1);
  // 戦闘中に敵が召喚したキャラクターは、召喚元（エリート・ボス）自身のステータスの80%。
  const _enemyScaled=isEnemySide?_enemySummonStats(placement&&placement.rightOf):null;
  if(_enemyScaled){ finalAtk=_enemyScaled.atk; finalHp=_enemyScaled.hp; }
  if(color){
    const key=_colorKey(color);
    const cb=G&&G.panelColorPermanentBuffs&&G.panelColorPermanentBuffs[key];
    if(cb){ finalAtk+=Number(cb.atk||0); finalHp+=Number(cb.hp||0); }
  }
  const unit=_makePanelSummonUnit({
    name:baseName,
    atk:finalAtk,
    hp:finalHp,
    color:color||(basePanel&&basePanel.color)||'',
    race:(basePanel&&basePanel.race)||'召喚',
    desc:basePanel&&basePanel.desc||'',
    keywords:basePanel&&basePanel.keywords||[],
    art:basePanel&&typeof getPanelArtPath==='function'?getPanelArtPath(basePanel):(basePanel&&basePanel.art)||'',
    no:(basePanel&&(basePanel.no||basePanel.artCode||basePanel._artCode))||''
  },[]);
  const placedIdx=_summonMidBattleAllyFront(unit,isEnemySide,placement);
  // 召喚は前衛の右端にだけ出す。前衛が満杯なら成立させない（後衛へ逃がさない）。
  const rearIdx=placedIdx;
  if(rearIdx>=0){
    await _applyLegacyBattleSummonTraits(unit,isEnemySide,placement);
    await _afterPanelSummon(unit,isEnemySide);
    if(!(placement&&placement.deferCompact)) requestBattleCompact();
  }
  return rearIdx>=0?unit:null;
}

// 旧入口は生成・配置だけを維持し、眷属の分類と5効果の計算は共通コアへ渡す。
async function _applyLegacyBattleSummonTraits(unit,isEnemySide,placement){
  // 薄いコアstateの初期化より前に眷属へ分類し、出撃本体のレベル適用から除外する。
  coreMarkBattleSummon(unit);
  const liveState=G._coreDrivenBattle&&_pveLiveCoreState;
  const state=liveState||_createPveCoreState();
  const side=isEnemySide?'p2':'p1';
  const oldSide=unit.side;
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const events=[];
  const emit=ev=>{
    events.push(ev);
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  unit.side=side;
  state._summonCount=state._summonCount||{};
  state._summonCount[side]=coreApplyKenzokuSummonEffects(state,unit,emit,placement&&placement.rightOf&&placement.rightOf.id);
  if(!liveState) _keepPveSummonState(state);
  try{ await _flushCorePveHitEvents(state,events,before); }
  finally{
    if(oldSide==null) delete unit.side; else unit.side=oldSide;
  }
}

function _panelSummonDisplayBoardCards(sourcePanel, contributingPanels){
  sourcePanel=runLevelBattleCard(sourcePanel);
  const center=sourcePanel?{...clone(sourcePanel),directions:['up','down','left','right']}:null;
  const panels=(contributingPanels||[]).map(entry=>{
    const p=entry&&entry.panel?entry.panel:entry;
    return p?{...clone(p),_mainBoardSlot:entry.idx,directions:['up','down','left','right'],
      ...(corePermanentDamageSpec(p.desc)?{_permanentEffectBoardSlot:entry.idx}:{})}:null;
  }).filter(Boolean);
  return [center,...panels];
}



// ── 動的に再計算が必要な「常時」パッシブ（マナ数依存・リーダー依存）を反映する ──
// マナ・リーダーのステータスは増加方向にのみ追従する（減少時に強制的にHPを削らないための簡易措置）
function _recomputeDynamicPanelStats(){
  const manaCount=_ensureMana();
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0) return;
    const desc=String(u.desc||'');
    if(/常時：このキャラクターは\+X\/\+Xを得る。Xはマナの数に等しい。/.test(desc)){
      const prev=u._manaScaleApplied||0;
      const delta=manaCount-prev;
      if(delta){
        u.atk=Math.max(0,(u.atk||0)+delta); u.baseAtk=Math.max(0,(u.baseAtk||0)+delta);
        if(delta>0) addUnitHp(u,delta,'ally');
        u._manaScaleApplied=manaCount;
      }
    }
  });
  (G.enemies||[]).forEach(u=>{
    if(!u||u.hp<=0||!_unitHasEffectName(u,'蝕の翼"スコル・ハティ"')) return;
    const prev=u._manaScaleApplied||0;
    const target=manaCount*4;
    const delta=target-prev;
    if(delta>0){ _addBattleStats(u,delta,delta,'enemy'); u._manaScaleApplied=target; }
  });
}
function _ensureMana(){
  G.mana=Number(G.mana)||0;
  return G.mana;
}
function _queueRingManaThresholdEffects(){
  if(!_hasRingNamed('嵐の指輪')) return;
  G._ringManaEffectPromise=(G._ringManaEffectPromise||Promise.resolve())
    .then(()=>_checkRingManaThresholdEffects())
    .catch(e=>console.error('[ring mana effects]',e));
}
async function _flushRingManaThresholdEffects(){
  // ユニットのマナ閾値は共通コアのイベント処理で完了済み。旧キューを
  // 待つと旧処理の再実行を許し、召喚やVFXを次の攻撃まで遅延させる。
  if(G._ringManaEffectPromise) await G._ringManaEffectPromise;
}
// 旧マナ入口もコアの指輪イベントを再生する。発動回数・威力・対象をここで計算しない。
async function _checkRingManaThresholdEffects(){
  if(G._checkingRingManaEffects||!_hasRingNamed('嵐の指輪')) return;
  G._checkingRingManaEffects=true;
  try{
    const state=_createPveCoreState();
    _stampCoreSideSlots(state);
    const events=[],emit=ev=>{events.push(ev);if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);};
    const before=new Set([...(state.units.p1||[]),...(state.units.p2||[])].filter(Boolean));
    const shown=[...before].map(u=>[u,u.atk,u.hp,u.maxHp,u.shield||0,u.weaken||0]);
    const releaseForms=presentHoldForms([...before]);
    const applyHit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>
      coreResolveHit(state,source,target,amount,counter,coreMathRng,emit,
        Object.assign({skipSourceEffects:!!skipSourceEffects,skipTough:!!skipTough},options||{}));
    try{
      coreApplyRingManaEffects(state,coreMathRng,emit,applyHit);
      shown.forEach(([u,...values])=>presentHoldShown(u,...values));
      await _flushCorePveHitEvents(state,events,before);
    }finally{
      shown.forEach(([u])=>presentReleaseShown(u));releaseForms();
      _keepPveSummonState(state);
    }
    _syncCoreResourcesToG(state);_syncCoreManaToG(state);_refreshManaDisplays();
  } finally {
    G._checkingRingManaEffects=false;
  }
}

// 復活：共通コアが基礎値を半分にして戻す。眷属や召喚時強化の対象にはしない。
function _reviveWithHalvedStats(unit,isEnemySide){
  if(!unit||typeof coreTryRevive!=='function') return false;
  const side=isEnemySide?'p2':'p1';
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    ..._pveCoreStageFields(),
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  state._revivalRingUsed=!!G._revivalRingUsed;
  const oldSide=unit.side, oldSlot=unit.slot;
  unit.side=side; unit.slot=(side==='p1'?G.allies:G.enemies).indexOf(unit);
  const reason=_unitHasKeyword(unit,'復活')?'復活':(_unitHasKeyword(unit,'根性')?'根性':'');
  const emit=ev=>{ if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  let revived=false;
  try{ revived=coreTryRevive(unit,state,emit); }
  finally{
    if(oldSide==null) delete unit.side; else unit.side=oldSide;
    if(oldSlot==null) delete unit.slot; else unit.slot=oldSlot;
  }
  if(!revived) return false;
  _syncCoreLifeToG(state);
  if(state._revivalRingUsed) G._revivalRingUsed=true;
  delete unit._deathFxDone;
  delete unit._deathFxReady;
  delete unit._deathWithoutEvent;
  if(reason==='復活'){
    unit._panelSummoned=true;
    _afterPanelSummon(unit,isEnemySide);
  }
  return true;
}
async function _afterPanelSummon(unit,isEnemySide,isInitialDeploy,fromCore){
  if(!unit) return;
  if(isEnemySide) return;
  // 旧PvEの召喚カウンタ。眷属の付与・5効果の判定は共通コアにあり、このカウンタは使わない。
  if(!isInitialDeploy){
    G._battleSummonedAllyCount=(G._battleSummonedAllyCount||0)+1;
  }
  // 旧PvEの召喚経路は共通コアを通らないため、ここでリッチの召喚監視を補完する。
  // 共通コアが既に連鎖召喚イベントを出した場合は fromCore=true で二重発動を防ぐ。
  if(!fromCore&&!isInitialDeploy&&unit.name!=='青シャドウ'&&!G._resolvingLichSummon){
    // 旧リッチの効果文を持つ時だけ（名前では判定しない。core.js の coreSummonUnit と同じ条件）。
    const lich=(G.allies||[]).find(x=>x&&x.hp>0&&!_isSealed(x)
      &&/味方が召喚された時[、,]?「青シャドウ」を1体召喚する/.test(
          typeof coreUnitEffectText==='function'?coreUnitEffectText(x):(x.effect||x.desc||'')
        ));
    if(lich){
      G._resolvingLichSummon=true;
      try{ await _spawnAdhocAllyUnit('青シャドウ',1,1,false,{rightOf:lich}); }
      finally{ G._resolvingLichSummon=false; }
    }
  }
  // 開戦時の通常出撃（isInitialDeploy）では、まだ全キャラクターの配置・描画が完了していないため
  // ここではまだ封印解放を行わない（DOM未確定のままgetBoundingClientRect()すると位置がズレる／
  // 演出無しで即解封されてしまう）。applyNewPanelBattleStart()側で全員の配置・再描画完了後に
  // まとめて一度だけ_resolveSeals()を呼ぶ。
  if(!isInitialDeploy) await _resolveSeals();
}
// 盤面配列を、lane の論理列から毎回まるごと組み直す。開戦配置の空欄や、
// コアが左詰めした配列を部分的に上書きすると、書かなかった範囲に古い参照が
// 残って同じ体が二箇所に見えるため、召喚配置では必ずこの出口を通す。
function _rebuildBattleUnitArray(arr, frontSlots, max, frontUnits, rearUnits){
  const seen=new Set();
  const uniqueAlive=units=>{
    const out=[];
    for(const unit of units||[]){
      if(!unit||unit.hp<=0||unit._isObject||unit._isSoul) continue;
      const key=unit.id!=null?String(unit.id):unit;
      if(seen.has(key)) continue;
      seen.add(key); out.push(unit);
    }
    return out;
  };
  const front=uniqueAlive(frontUnits);
  const rear=uniqueAlive(rearUnits);
  arr.length=max;
  for(let i=0;i<max;i++) arr[i]=null;
  front.slice(0,frontSlots).forEach((unit,i)=>{
    unit.lane='front'; unit._battleSlot=i; arr[i]=unit;
  });
  rear.slice(0,Math.max(0,max-frontSlots)).forEach((unit,i)=>{
    unit.lane='rear'; unit._battleSlot=frontSlots+i; arr[frontSlots+i]=unit;
  });
  return {front:front.slice(0,frontSlots),rear:rear.slice(0,Math.max(0,max-frontSlots))};
}

function _summonPanelUnitToFront(unit, isEnemySide, preferredSlot){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 開戦配置の再実行やコピー経路で同じ体が残っていても、他の体の枠は動かさず
  // その体の参照だけを先に外す。配列全体を lane から組み直すと、出撃順によって
  // 既に配置済みの体まで入れ替わるため、ここでは空欄化だけに留める。
  const unitId=unit&&unit.id!=null?String(unit.id):null;
  for(let i=0;i<arr.length;i++){
    const existing=arr[i];
    if(existing===unit||(unitId!=null&&existing&&existing.id!=null&&String(existing.id)===unitId)) arr[i]=null;
  }
  // 初期出撃・旧互換入口も、戦闘中召喚と同じ陣営総数上限を先に確認する。
  // ここを通さず空き枠だけを見ると、上限超過体が一度配列へ入り、
  // compact/render の間だけ左端や空き位置へ表示される。
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  // 開戦時は魔導板の希望枠を優先し、埋まっていれば近い空き枠へ置く。
  if(Number.isInteger(preferredSlot)&&preferredSlot>=0&&preferredSlot<frontSlots){
    let slot=isFree(arr[preferredSlot])?preferredSlot:-1;
    for(let distance=1;slot<0&&distance<frontSlots;distance++){
      const left=preferredSlot-distance;
      const right=preferredSlot+distance;
      if(left>=0&&isFree(arr[left])) slot=left;
      else if(right<frontSlots&&isFree(arr[right])) slot=right;
    }
    if(slot>=0){
      unit.lane='front'; unit._battleSlot=slot; arr[slot]=unit; return slot;
    }
    return -1;
  }
  for(let i=frontSlots-1;i>=0;i--){
    if(isFree(arr[i])){
      unit.lane='front'; unit._battleSlot=i; arr[i]=unit; return i;
    }
  }
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(isFree(arr[i])){
      unit.lane='rear'; unit._battleSlot=i; arr[i]=unit; return i;
    }
  }
  return -1;
}
// 開戦時のパネル出撃（isInitialDeploy）とは異なり、戦闘中に実際に発生した召喚
// （効果による召喚・仲間化・蘇生等）は必ず前衛に置く。後衛には絶対に溢れさせない
// （前衛が満杯なら召喚自体を諦める）。
// 戦闘中に敵（エリート・ボス）がキャラクターを召喚する場合、召喚されたキャラクターの
// ATK/HPは召喚元自身のステータスの80%とする。HPは被ダメージで揺れないよう最大HPを基準にする。
function _enemySummonStats(source){
  return typeof coreEnemySummonStats==='function'?coreEnemySummonStats(source):null;
}

// 前衛の左端／右端へ召喚する（placement:{frontEdge:'left'|'right'}）。
// 端が埋まっている場合は前衛全体を反対側へ1つ寄せて端を空ける。
function _summonMidBattleFrontEdge(unit, isEnemySide, edge){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 盤面枠が空いていても、陣営の総数上限に達している召喚は生成しない。
  // ここを通る端寄せ召喚だけ上限判定を持たないと、生成直後に左端へ一瞬現れる。
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  // coreInsertSummonedUnit() は空欄を詰めるため、配列の先頭側に後衛が来ることがある。
  // 物理添字ではなく lane を体の属性として扱う。
  const front=arr.filter(u=>!isFree(u)&&(u.lane||'front')!=='rear');
  const rear=arr.filter(u=>!isFree(u)&&(u.lane||'front')==='rear');
  if(front.length>=frontSlots) return -1;
  if(edge==='left') front.unshift(unit); else front.push(unit);
  const rebuilt=_rebuildBattleUnitArray(arr,frontSlots,max,front,rear);
  return edge==='left'?0:rebuilt.front.length-1;
}

function _summonMidBattleAllyFront(unit, isEnemySide, placement){
  // 「前衛の両端へ」のように置き場所が決まっている召喚は専用の配置に回す。
  if(placement&&placement.frontEdge) return _summonMidBattleFrontEdge(unit,isEnemySide,placement.frontEdge);
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);

  // 空き扱いにできる枠（未使用・戦闘不能・オブジェクト・ソウル）。
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  // 置いた位置を_battleSlotへ書き戻す。compactBattleUnits()は_battleSlotを持つユニットだけを
  // その枠へ固定し、持たないユニットは行の中央へ寄せ直す。召喚したユニットに_battleSlotが
  // 無いと、直後のrequestBattleCompact()で中央へ動かされ「効果元の左に出る」「戦闘中に
  // 並び順が入れ替わる」ことになる。挿入で他のユニットもずれるため、前衛全体を振り直す。
  const rebuildFront=(front)=>{
    const rear=arr.filter(u=>!isFree(u)&&(u.lane||'front')==='rear');
    return _rebuildBattleUnitArray(arr,frontSlots,max,front,rear);
  };

  // 戦闘中の召喚は前衛へ置く。前衛の効果元だけは右隣への挿入を優先し、
  // 後衛の効果元からの召喚は前衛右端へ回す（後衛には置かない）。
  const source=placement&&placement.rightOf;
  if(source){
    // コアイベントから渡るsourceは、state.unitsの実体またはスナップショット由来の
    // 別オブジェクトになり得る。参照一致だけで検索すると、sourceIdx=-1になって
    // rightOfSourceが右端／後衛へフォールバックし、召喚順と表示順が崩れる。
    let sourceIdx=arr.indexOf(source);
    if(sourceIdx<0&&source.id!=null) sourceIdx=arr.findIndex(u=>u&&u.id===source.id);
    // 明示されたrightOfSourceを解決できない場合に、後衛／右端へ落とすと
    // 召喚イベントの親子順と画面上の位置が壊れる。位置指定付き召喚は
    // 別位置へ置かず、呼び出し側の上限・配置失敗処理へ返す。
    if(sourceIdx<0) return -1;
    const actualSource=sourceIdx>=0?arr[sourceIdx]:source;
    unit._summonedFromId=String(actualSource.id||'');
    const sourceIsRear=(actualSource.lane||'front')==='rear';
    if(sourceIsRear){
      // 後衛は編成由来の列であり、戦闘中の召喚体を差し込まない。
      // コアと同じく、効果元が後衛でも召喚体は前衛の右端へ置く。
      const front=arr.filter(u=>!isFree(u)&&(u.lane||'front')!=='rear');
      if(front.length>=frontSlots) return -1;
      front.push(unit);
      const rebuilt=rebuildFront(front);
      return rebuilt.front.length-1;
    }
    if(!sourceIsRear&&sourceIdx>=0){
      // ① 効果元より右に空きがあれば、間の味方を右へ1つずつ寄せて右隣へ挿入する。
      const front=arr.filter(u=>!isFree(u)&&(u.lane||'front')!=='rear');
      if(front.length>=frontSlots) return -1;
      const logicalSource=front.indexOf(actualSource);
      if(logicalSource<0) return -1;
      let insertAt=placement&&placement.leftOf?logicalSource:logicalSource+1;
      // rightOfSource の連続召喚は、同じ親から直前までに追加された召喚体の
      // 後ろへ置く。これにより Kitty→Cat1→Cat2 の時系列を保持し、毎回親の
      // 直後へ差し込んで Cat2→Cat1 になる逆転を防ぐ。
      if(!(placement&&placement.leftOf)){
        while(insertAt<front.length&&front[insertAt]&&
          String(front[insertAt]._summonedFromId||'')===String(actualSource.id||'')) insertAt++;
      }
      front.splice(insertAt,0,unit);
      rebuildFront(front);
      // 呼び出し側が次の召喚の基準に使うのは、効果元ではなく今回の
      // 召喚体の実スロット。leftOf の場合に source+1 を返すと、コアの
      // 連続召喚が「元の右隣」を再利用し、表示順とイベント順が崩れる。
      return insertAt;
    }
  }

  // 指輪など、効果元の位置を持たない召喚は一番右の空き枠へ置く。
  const front=arr.filter(u=>!isFree(u)&&(u.lane||'front')!=='rear');
  if(front.length>=frontSlots) return -1;
  front.push(unit);
  const rebuilt=rebuildFront(front);
  return rebuilt.front.length-1;
}

function _summonPanelUnitToRear(unit, isEnemySide, preferredSlot){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 同じ体の古い参照だけを外し、他の体のスロットは詰め直さない。
  const unitId=unit&&unit.id!=null?String(unit.id):null;
  for(let i=0;i<arr.length;i++){
    const existing=arr[i];
    if(existing===unit||(unitId!=null&&existing&&existing.id!=null&&String(existing.id)===unitId)) arr[i]=null;
  }
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  if(Number.isInteger(preferredSlot)&&preferredSlot>=frontSlots&&preferredSlot<frontSlots+rearSlots){
    let slot=isFree(arr[preferredSlot])?preferredSlot:-1;
    for(let distance=1;slot<0&&distance<rearSlots;distance++){
      const left=preferredSlot-distance;
      const right=preferredSlot+distance;
      if(left>=frontSlots&&isFree(arr[left])) slot=left;
      else if(right<frontSlots+rearSlots&&isFree(arr[right])) slot=right;
    }
    if(slot>=0){
      unit.lane='rear'; unit._battleSlot=slot; arr[slot]=unit; return slot;
    }
    return -1;
  }
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(isFree(arr[i])){
      unit.lane='rear'; unit._battleSlot=i; arr[i]=unit; return i;
    }
  }
  return -1;
}

function _battleSlotForMainBoardSlot(idx,toRear){
  const max=MAX_ALLIES||14;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const col=Math.max(0,Math.min(4,Number(idx)%5));
  if(toRear){
    if(rearSlots<=0) return -1;
    const mapped=rearSlots>=5
      ?Math.floor((rearSlots-5)/2)+col
      :Math.round(col*Math.max(0,rearSlots-1)/4);
    return frontSlots+Math.max(0,Math.min(rearSlots-1,mapped));
  }
  const mapped=frontSlots>=5
    ?Math.floor((frontSlots-5)/2)+col
    :Math.round(col*Math.max(0,frontSlots-1)/4);
  return Math.max(0,Math.min(frontSlots-1,mapped));
}

async function applyNewPanelBattleStart(options){
  const deferOpeningEffects=options===true||!!(options&&options.deferOpeningEffects);
  const persistEternal=!(options&&Object.prototype.hasOwnProperty.call(options,'persistEternal'))
    ||!!options.persistEternal;
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const equip=board&&Array.isArray(board.boardCards)?board.boardCards:[];
  // 共鳴の力：開戦時に場に出た同色の味方全員へ+3/+3を与える。対象キャラの出撃が全て終わった後に
  // まとめて適用するため、該当パネルの色だけここに集めておく（deploySlotGroup内では未出撃の味方に
  // 反映漏れが起きるため）。
  // メイン置き場①〜⑦の物理位置がそのまま出撃順を決める。前衛①②③④、後衛⑤⑥⑦。
  // 開戦召喚は魔導板の列に対応する希望スロットへ配置する。
  // 「どのスロットが出撃するか・レーン・体数・並び順」は共通ビルダー（battle/formation.js）が決める。
  // ここで独自に組み立て直さないこと（オンライン側と二重実装になり、レーンと出撃順が食い違った）。
  // persistEternal=true：永劫の力の+1/+1をカード本体へ永久加算する（オンラインはfalse）。
  _recordBattleTrace('opening_panel_scan',{equip:equip.map((p,i)=>p?{i,name:p.name,category:p.category}:null),
    frontSlots:[...((typeof MAIN_BOARD_FRONT_SLOTS!=='undefined'&&MAIN_BOARD_FRONT_SLOTS)||[1,3])],
    rearSlots:[...((typeof MAIN_BOARD_REAR_SLOTS!=='undefined'&&MAIN_BOARD_REAR_SLOTS)||[10,12,14])]});
  const formation=typeof buildBoardFormation==='function'
    ?(persistEternal
      ?buildBoardFormation(board,{persistEternal:true})
      :buildBoardFormation(board,{persistEternal:false}))
    :{entries:[]};
  for(const entry of formation.entries){
    const summoned=entry.unit;
    const panel=entry.panel;
    // コピー召喚先にも強化カードの効果全文がフロー表示されるよう、寄与している強化パネルを複製して引き継ぐ
    if(entry.contributingPanels.length){
      summoned.boardCards=_panelSummonDisplayBoardCards(panel,entry.contributingPanels);
    }
    const placed=entry.toRear
      ?_summonPanelUnitToRear(summoned,false,summoned._battleSlot)
      :_summonPanelUnitToFront(summoned,false,summoned._battleSlot);
    if(placed>=0){
      _recordBattleTrace('opening_summon_placed',{sourceId:panel.id||panel.name,unitId:summoned.id,name:summoned.name,
        liveCount:(G.allies||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length});
      // ここは戦闘前の配置なので、体数にかかわらず眷属は付けない。
      // 追加分に対する旧召喚監視の呼び出し順は維持する。開戦効果のコピーはコアが生成する。
      await _afterPanelSummon(summoned,false,entry.copyIndex===0);
    }else{
      _recordBattleTrace('opening_summon_rejected',{sourceId:panel.id||panel.name,unitId:summoned.id,name:summoned.name,
        liveCount:(G.allies||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length,
        max:MAX_ALLIES||14});
    }
  }
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0||!Number.isInteger(u._mainBoardSlot)) return;
    _applyAdjacentPanelEnhancements(u,_collectAdjacentEnhancements(board,u._mainBoardSlot));
  });
  compactBattleUnits();
  // **色・虹の瞳の指輪の分は、出撃の時点から足した数値を見せる。**（2026-10-02 利用者指摘）
  // 魔導板では最初から指輪込みで見せているが、コアは開戦の指輪処理で足すため、そのままだと
  // 戦闘開始で一度指輪抜きへ戻り、開戦でまた上がって見えた。計算はコアのまま、表示だけ先に揃える。
  // 開戦の再生（_finishNewPanelBattleStartEffects）でも同じ分を据え置きに含め、上昇演出は出さない。
  (G.allies||[]).forEach(u=>{
    if(!u||(u.hp<=0&&!u._deployedAtZeroHp)||typeof presentHoldShown!=='function'||typeof _panelEyeRingPreviewBonus!=='function') return;
    const b=Number(_panelEyeRingPreviewBonus(u))||0;
    if(b>0) presentHoldShown(u,(Number(u.atk)||0)+b,(Number(u.hp)||0)+b,(Number(u.maxHp)||Number(u.hp)||1)+b,Number(u.shield)||0,Number(u.weaken)||0);
  });
  // 全キャラクターの配置が確定したのでここで一度描画し、封印解放等のVFXが正しい座標
  // （getBoundingClientRect）を取得できるようDOMのレイアウト確定を待つ。
  if(typeof renderAll==='function') renderAll();
  await _awaitFrame(); await sleep(50);
  if(deferOpeningEffects) return;
  await _finishNewPanelBattleStartEffects();
}

// 開戦時の戦闘ルールも共通コアへ委譲する。配置・封印解放のDOM演出だけは
// この関数の後段で既存処理へ戻す。
async function _finishNewPanelBattleStartEffects(){
  // 復活の基準値は、開戦効果（バフ）を解決する前の値で毎戦闘作り直す。
  // coreStampUnitBaseStats() が createCoreUnit() 生成体を保護するため、
  // 開戦後に生成済みの召喚体の基準値は上書きしない。
  [...(G.allies||[]), ...(G._preserveEnemyOpening?[]:(G.enemies||[]))].forEach(coreStampUnitBaseStats);
  _recordBattleTrace('opening_core_start',{allyCount:(G.allies||[]).filter(Boolean).length});
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    ..._pveCoreStageFields(),
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    deferManaThresholdEffects:true,
    _deferLichSummons:true,
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{
    localEvents.push(ev);
    if(ev&&ev.type==='mana_gain') _recordBattleTrace('mana_gain_generated',{unitId:ev.unitId||null,side:ev.side,amount:Number(ev.amount)||0,reason:ev.reason||''});
    if(ev&&ev.type==='summon') _recordBattleTrace('summon_event_generated',{unitId:ev.unit&&ev.unit.id||null,sourceId:ev.sourceId||null,side:ev.side,placement:ev.placement||''});
    if(ev&&ev.type==='mana_threshold') _recordBattleTrace('mana_threshold_generated',{unitId:ev.unitId||null,side:ev.side,cost:ev.cost,deferred:!!ev.deferred,desc:ev.desc||''});
    if(ev&&ev.type==='summon_rejected') _recordBattleTrace('summon_rejected',{
      sourceId:ev.sourceId||null,name:ev.name||'',liveCount:ev.liveCount,max:ev.max,reason:ev.reason||''
    });
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  // **オプションをコアへそのまま渡すこと。** ここで落とすと、コアが
  // 「全員にダメージを入れてからまとめて誘発」（coreHitAll の deferTriggers/collect）を
  // 指示しても PvE 側だけ1体ずつ即誘発になり、オンラインと結果が食い違う。
  const applyHit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit,
      Object.assign({skipSourceEffects:!!skipSourceEffects,skipTough:!!skipTough},options||{}));
  };
  // **戦闘ループと同じく、表示するATK/HPを開戦処理の前の値で据え置く。**
  // コアは開戦効果を一度に解決するため、据え置かないと「死の体感」＋「闇の炎」のように
  // 開戦でダメージが連鎖する盤面で、最初の数値が出た時点で最終HPまで下がって見え、
  // 倒れた敵が演出より先に消えたり、古い値で描き直されたりしていた（利用者報告：ボス戦）。
  ['p1','p2'].forEach(side=>(state.units[side]||[]).forEach(unit=>coreApplyPassiveHpRings(state,unit,side)));
  const _openingShownBefore=[...(G.allies||[]),...(G.enemies||[])].filter(Boolean)
    .map(u=>[u,Number(u.atk)||0,Number(u.hp)||0,Number(u.maxHp)||Number(u.hp)||1,Number(u.shield)||0,Number(u.weaken)||0]);
  const releaseForms=presentHoldForms(_openingShownBefore.map(([u])=>u));
  if(typeof presentBeginPlayback==='function') presentBeginPlayback();
  let _openingPlaybackOpen=true;
  const _endOpeningPlayback=()=>{
    if(!_openingPlaybackOpen) return;
    _openingPlaybackOpen=false;
    releaseForms();
    if(typeof presentEndPlayback==='function') presentEndPlayback();
  };
  try{
    // 開戦処理は coreRunOpening() が唯一の実装。**ここへ手順を書き戻さないこと。**
    // 以前はPvEとオンラインで同じ手順が別々に書かれており、
    // 「生命の力」のHP2倍のようにPvEにしか無い／コアにしか無い工程があった。
    const _openingResolveSeals=()=>{ /* PvEの封印解放は演出付きで後段の _resolveSeals() が行う */ };
    coreRunOpening(state,coreMathRng,emit,applyHit,_openingResolveSeals);
    _keepPveSummonState(state);
    _recordBattleTrace('opening_effects_done',{life:_currentBattleLife(),
      stateLife:Number(state.life&&state.life.p1)||0,
      味方:(state.units.p1||[]).filter(Boolean).filter(u=>u.hp>0)
        .map(u=>`${u.name}:${u.atk}/${u.hp}`).join(' ')});
    _syncCoreResourcesToG(state);
  }catch(e){
    _endOpeningPlayback();
    throw e;
  }finally{
    state._openingPhase=false;
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  // マナ閾値による変身は、名前だけでなく変身先カードの能力・キーワードも反映する。
  localEvents.filter(ev=>ev&&ev.type==='transform'&&!ev.from).forEach(ev=>{
    const target=(ev.side==='p1'?G.allies:G.enemies).find(u=>u&&u.id===ev.unitId);
    if(target){
      // 共通コアの変身スナップショットをそのまま反映する。名前・数値だけを
      // 書き換えると、ドラゴネット／バンダースナッチの絵・枠・説明が旧形態に残る。
      if(ev.unit) Object.assign(target,ev.unit);
      else _setBattleUnitForm(target,ev.name,ev.atk,ev.maxHp,target.color);
    }
  });
  const spawned=[...state.units.p1,...state.units.p2].filter(u=>u&&!before.has(u)&&!u._corePendingSummon);
  for(const spawnedUnit of spawned){
    const targetList=state.units.p1.includes(spawnedUnit)?G.allies:G.enemies;
    if(!targetList.includes(spawnedUnit)) targetList.push(spawnedUnit);
    await _afterPanelSummon(spawnedUnit,targetList===G.enemies,true,true);
  }
  _recordBattleTrace('opening_core_events',{count:localEvents.length,types:localEvents.map(e=>e&&e.type).filter(Boolean)});
  try{
    // 瞳の指輪（色・虹）の分は出撃時から見せているので、据え置きの値に含め、その stat_change は再生しない。
    const _ringShown=new Map();
    localEvents.forEach(ev=>{
      if(!ev||ev.type!=='stat_change'||ev.side!=='p1'||(ev.reason!=='color_ring'&&ev.reason!=='rainbow_ring')) return;
      const key=String(ev.unitId);
      const r=_ringShown.get(key)||{atk:0,hp:0,maxHp:0};
      r.atk+=Number(ev.atk)||0; r.hp+=Number(ev.hp)||0; r.maxHp+=Number(ev.maxHp!=null?ev.maxHp:ev.hp)||0;
      _ringShown.set(key,r);
      ev._preShown=true;
    });
    if(typeof presentHoldShown==='function') _openingShownBefore.forEach(([u,atk,hp,maxHp,shield,weaken])=>{
      const r=_ringShown.get(String(u&&u.id))||{atk:0,hp:0,maxHp:0};
      presentHoldShown(u,atk+r.atk,hp+r.hp,maxHp+r.maxHp,shield,weaken);
    });
    await _flushCorePveHitEvents(state,localEvents,before);
    _syncCoreManaToG(state);
  }finally{
    if(typeof presentReleaseShown==='function'){
      _openingShownBefore.forEach(([u])=>presentReleaseShown(u));
      [...(G.allies||[]),...(G.enemies||[])].forEach(u=>u&&presentReleaseShown(u));
    }
    _endOpeningPlayback();
  }
  // 生命の力のHP2倍は coreRunOpening() の中で解決済み。
  // ここで再度呼ぶと2回適用され、オンラインと食い違う。
  // 死亡イベント中のrequestBattleCompact()は、外側の開戦再生中は保留される。
  // 再生を閉じた直後にcompact入口を通さずrenderAll()すると、死亡体を含む配列を
  // そのまま描き直してHP0のカードが再出現するため、戦闘ループと同じ詰め処理を行う。
  if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true});
  else if(typeof renderAll==='function') renderAll();
  await _resolveSeals();
  _recomputeDynamicPanelStats();
}
