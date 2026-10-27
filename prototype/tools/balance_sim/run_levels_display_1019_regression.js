#!/usr/bin/env node
'use strict';
// 内蔵シートを本体loaderで読み、表示・編成・保存・戦闘の実際の入口を突き合わせる。
// DOMは出力を捕まえるだけ。ブラウザの色・配置・可視性の検査ではない。
const assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {initialize}=require('./run_bot'),{makeElement}=require('./stub');

function element(tag){
  const el=makeElement(tag);let html='';
  Object.defineProperty(el,'innerHTML',{get:()=>html,set:value=>{html=String(value);el.children=[];}});
  const classes=()=>new Set(el.className.split(/\s+/).filter(Boolean));
  el.classList={contains:c=>classes().has(c),add(...cs){el.className=[...new Set([...classes(),...cs])].join(' ');},
    remove(...cs){el.className=[...classes()].filter(c=>!cs.includes(c)).join(' ');},
    toggle(c,on){const next=on==null?!classes().has(c):on;next?this.add(c):this.remove(c);return next;},
    [Symbol.iterator](){return classes()[Symbol.iterator]();}};
  el.replaceChildren=(...children)=>{el.children=[];children.forEach(c=>el.appendChild(c));};
  el.append=(...children)=>children.forEach(c=>el.appendChild(c));
  el.insertBefore=(child,before)=>{const i=el.children.indexOf(before);if(i<0) return el.appendChild(child);el.children.splice(i,0,child);child.parentNode=el;return child;};
  el.querySelector=selector=>el.children.find(c=>selector[0]==='.'?c.classList?.contains(selector.slice(1)):c.id===selector.slice(1))||null;
  el.matches=selector=>selector.split(',').some(s=>s.trim().split('.').filter(Boolean).every(c=>el.classList.contains(c)));
  el.cloneNode=deep=>{const c=element(tag);c.className=el.className;c.innerHTML=html;
    for(const key of Object.keys(el).filter(k=>k.startsWith('data-'))) c[key]=el[key];
    if(deep) el.children.forEach(child=>c.appendChild(child.cloneNode?child.cloneNode(true):child));return c;};
  return el;
}
function metrics(node){
  const value=kind=>Number(node.innerHTML.match(new RegExp(`class="card-summon-${kind}[^\"]*">([^<]+)`))?.[1]);
  return {atk:value('atk'),hp:value('hp'),desc:node.getAttribute('data-preview')||''};
}
function baselineFunction(text,name){
  const found=text.match(new RegExp(`^function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^\\}`,'m'));
  assert.ok(found,name);return vm.runInThisContext('('+found[0]+')');
}

async function testRunLevelDisplay(api){
  RUN_LEVEL_CONFIG.rewardEnabled=true; // 2026-10-19：レベル報酬は止めたが、表示の仕組みはこの検査の中だけ有効にして確かめる。
  let checked=0;
  const check=async(name,fn)=>{await fn();checked++;console.log('OK '+name);};
  const make=no=>{const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);return makePanel(def.id);};
  const fresh=values=>{
    api.resetRun();initState();SaveRun.begin();
    Object.assign(G,{phase:'reward',_wave:1,_waveStage:4,_waveLife:3,life:3,gold:800,_isRewardTown:true,_freeRewardPanelMode:true});
    G.runLevels.values={...coreNormalizeRunLevels(values)};G.rings=[];G.mainBoard.fill(null);G.enemies=[];
    _dragSrc=null;_rewCards=[];_rewFreePickDone=false;_collectionMerged=false;
  };
  const formed=(card,enchant)=>{
    G.mainBoard.fill(null);G.mainBoard[1]=card;
    if(enchant){card.directions=['left'];enchant.directions=['right'];G.mainBoard[0]=enchant;}
    return buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered.find(e=>e.slotIdx===1).unit;
  };
  const stateFor=(units,extra={})=>createBattleState({frontSlots:7,summonDefs:[...PANEL_POOL,...ENEMY_POOL],
    ...runLevelCoreFields(),sides:{p1:{units},p2:{units:[{id:'foe',name:'相手',atk:1,hp:9999,maxHp:10000}]}},...extra});
  const fight=state=>{const events=[];runBattleCore(state,createSeededRng(1019),{turnLimit:2,onEvent:e=>events.push(e)});return events;};
  const ids=new Map(['hand-slots','hand-pane','hand-pane-board-bg','gameover-board-grid',
    'collection-preview-card','collection-color-orb','collection-card-name','collection-card-stats','collection-card-desc',
    'collection-prev','collection-next','collection-merge'].map(id=>[id,element('div')]));
  ids.get('hand-pane').appendChild(ids.get('hand-slots'));
  const previous={create:document.createElement,get:document.getElementById,collectionState:SaveProfile.collectionState};
  document.createElement=element;document.getElementById=id=>ids.get(id)||previous.get(id);
  SaveProfile.collectionState=()=>({seen:true,acquired:true});
  const board=()=>{renderHeRow('hand-slots',G.mainBoard,0,G.mainBoard.length,'boardCards');return ids.get('hand-slots').children[1];};
  const detail=card=>{
    _collectionKind=String(card.category)==='キャラクター'?'character':'enchant';
    _collectionSelected=_collectionDefinitions(_collectionKind).findIndex(c=>c.no===card.no);
    assert.ok(_collectionSelected>=0);_collectionRenderDetail();
    return {stats:ids.get('collection-card-stats').textContent,desc:ids.get('collection-card-desc').innerHTML};
  };
  try{
    for(const level of [2,3]){
      fresh({atk:level,hp:level+1});
      await check(`レベル${level}：報酬・魔導店・行商人・デバッグ・魔導板・詳細のATK/HPは倍率どおり、固定ダメージは据え置き`,()=>{
        const card=make('C058'),raw=clone(card);
        for(const ctx of ['reward','shop','peddler','debug-palette']){
          G._isShop=ctx==='shop'||ctx==='peddler';G._isPeddler=ctx==='peddler';
          const node=ctx==='reward'||G._isShop?_mkRewDiv(card,null,0):mkCardEl(card,-1,ctx),m=metrics(node);
          assert.equal(m.atk,raw.power*level,ctx);assert.equal(m.hp,raw.life*(level+1),ctx);assert.ok(m.desc.includes(`4ダメージ`),ctx);
        }
        G._isShop=false;G._isPeddler=false;
        const unit=formed(card),m=metrics(board()),d=detail(card);
        assert.equal(m.atk,unit.atk);assert.equal(m.hp,unit.maxHp);assert.ok(m.desc.includes(`4ダメージ`));
        assert.equal(d.stats,`ATK${unit.atk} / HP${unit.maxHp}`);assert.ok(d.desc.includes(`4ダメージ`));
        assert.ok(fight(stateFor([unit])).some(e=>e.type==='damage'&&e.sourceId===unit.id&&e.damageKind==='attack_effect'&&e.amount===4));
        assert.deepEqual(card,raw,'表示・戦闘でカードへ焼き込まない');
      });
      fresh({atk:level,hp:level+1});
      await check(`レベル${level}：戦闘修正・接続強化・詳細・ツールチップの数値とコアが一致`,()=>{
        const hero=make('C011');hero.desc=make('E061').desc;const enchant=make('E034'),unit=formed(hero,enchant),m=metrics(board());
        assert.equal(m.atk,hero.power*level+8);assert.equal(m.hp,hero.life*(level+1)-3);
        assert.equal(m.atk,unit.atk);assert.equal(m.hp,unit.maxHp);
        assert.ok(m.desc.includes(hero.desc.split('：')[1]));assert.ok(m.desc.includes('+8/-3'),m.desc);
        assert.ok(_collectionDescriptionHtml(enchant,'enchant').includes(`+8/-3`));
        assert.ok(mkCardEl(enchant,-1,'reward').getAttribute('data-preview').includes(`+8/-3`));
        const e=fight(stateFor([unit])).find(e=>e.type==='stat_change'&&e.reason==='attack_self_buff');
        assert.ok(e);const pair=hero.desc.match(/\+(\d+)\/\+(\d+)/);assert.equal(e.atk,Number(pair[1]));assert.equal(e.hp,Number(pair[2]));
        const damage=make('E008'),caster=formed(make('C006'),damage);
        assert.ok(_rawSubstitutedDesc(damage).includes(`${Number(damage.desc.match(/(\d+)ダメージ/)[1])}ダメージ`));
        assert.ok(_unitPreviewText(caster,_rawSubstitutedDesc(caster),0).includes(`${Number(damage.desc.match(/(\d+)ダメージ/)[1])}ダメージ`));
        assert.ok(fight(stateFor([caster])).some(e=>e.type==='damage'&&e.damageKind==='attack_effect'&&e.amount===Number(damage.desc.match(/(\d+)ダメージ/)[1])));
      });
      fresh({atk:level,hp:level+1});
      await check(`レベル${level}：眷属の注釈・固定コピーの説明と召喚結果、コピーの効果は一度だけ`,()=>{
        const card=make('C060'),unit=formed(card),desc=_rawSubstitutedDesc(card);
        const shown=desc.match(/(\d+)\/(\d+)の「緑ペリカン」/);assert.ok(shown,desc);
        const summons=fight(stateFor([unit])).filter(e=>e.type==='summon'&&e.side==='p1');assert.equal(summons.length,2);
        for(const e of summons){assert.equal(e.unit.atk,Number(shown[1]));assert.equal(e.unit.hp,Number(shown[2]));}
        const copy=make('C112'),caster=formed(copy);
        assert.match(_rawSubstitutedDesc(copy),/コピーを召喚/);
        const state=stateFor([caster]),events=fight(state),child=events.find(e=>e.type==='summon').unit;
        assert.equal(child.atk,caster.atk);assert.equal(child.hp,caster.hp);assert.equal(child.desc,copy.desc);
        assert.equal(child.boon,undefined);
        assert.equal(coreApplyUnitRunLevels(child,G.runLevels.values),child);

      });
    }
    fresh({atk:2,hp:5});
    await check('瞳の指輪：接続強化の後に加算し、高レベルでも表示とコアの開戦値が一致',()=>{
      G.rings=[clone(RING_POOL.find(r=>r.name==='虹の瞳の指輪'))];
      const hero=make('C058'),enchant=make('E034'),unit=formed(hero,enchant);
      assert.equal(unit.atk,hero.power*2+8);assert.equal(unit.maxHp,hero.life*5-3);
      const state=stateFor([unit],{rings:{p1:G.rings,p2:[]}}),target=state.units.p1[0];
      coreApplyOpeningRingsToUnitEarly(state,target,()=>{});
      const actual=_panelCharacterPreviewStats(_getPartyBoardUnit(),1,hero);
      assert.deepEqual(actual,{atk:target.atk,hp:target.hp});assert.ok(actual.atk>unit.atk);
    });
    fresh({atk:2,hp:5});
    await check('X・正負・ゼロ・ATK奪取・回数：対象の数値・定義・回数を保持',()=>{
      const caster=make('C006'),dynamic=make('E042');assert.match(_rawSubstitutedDesc(dynamic),/Xダメージ/);
      const u=formed(caster,dynamic),ev=fight(stateFor([u],{resources:{p1:{mana:4}}}));
      assert.ok(ev.some(e=>e.type==='damage'&&e.sourceId===u.id&&e.damageKind==='attack_effect'&&e.amount===4));
      assert.match(_rawSubstitutedDesc(make('E036')),/ATK\+X/);
      const card=make('C011');card.desc='ATK+2 HP-1 +0/-2 ATKを2奪う。4ダメージを2回与える。';
      assert.equal(_rawSubstitutedDesc(card),'ATK+2 HP-1 +0/-2 ATKを2奪う。4ダメージを2回与える。');
    });
    fresh({atk:2,hp:5});
    await check('クエスト配布・依頼カード：生成時は素のまま、提示・盤面・詳細で現在レベル',()=>{
      const required=_qMakeRequiredCard({questId:'Q001'});assert.ok(required);assert.equal(required.no,'E075');
      assert.equal(corePermanentDamageValue(required),12);assert.match(_mkRewDiv(required,null,0).getAttribute('data-preview'),/12ダメージ/);
      const offer=_qMakeRequiredCard({questId:'Q006'});assert.ok(offer);
      const raw=clone(offer),m=metrics(mkCardEl(offer,0,'quest'));
      assert.equal(m.atk,raw.power*2);assert.equal(m.hp,raw.life*5);assert.deepEqual(offer,raw);
    });
    fresh({atk:2,hp:5});
    await check('編成外の初期配置・変身・敵の奪取：本体能力値だけが現在レベル、本文・接続効果は不変',()=>{
      const external={id:'external',name:'外部配置',atk:3,hp:8,maxHp:8,desc:'攻撃：このキャラクターは+2/+1を得る。'};
      const raw=clone(external),state=stateFor([external]);assert.equal(state.units.p1[0].atk,6);assert.equal(state.units.p1[0].maxHp,40);
      assert.match(state.units.p1[0].desc,/\+2\/\+1/);assert.deepEqual(external,raw);
      const target=state.units.p1[0];coreTransformUnit(state,target,make('C058').name,()=>{});
      assert.equal(target.atk,make('C058').power*2);assert.match(target.desc,/4ダメージ/);
      assert.match(_rawSubstitutedDesc(target),/4ダメージ/);
      const stolen=state.units.p2[0];stolen.desc='攻撃：全ての敵に4ダメージを与える。';
      stolen._adjacentPanelEffectTexts=['攻撃：このキャラクターは+2/+1を得る。'];
      const atk=stolen.atk,hp=stolen.maxHp;const events=[];
      assert.equal(coreStealUnit(state,stolen,'p1',e=>events.push(e),target.id),true);
      assert.equal(stolen.atk,atk*2);assert.equal(stolen.maxHp,hp*5);assert.match(stolen.desc,/4ダメージ/);
      assert.match(stolen._adjacentPanelEffectTexts[0],/\+2\/\+1/);assert.equal(stolen._useEnemyVisualFrame,true);
      assert.equal(events.at(-1).unit.atk,stolen.atk);assert.equal(coreApplyUnitRunLevels(stolen,G.runLevels.values),stolen);
      const child=coreSummonUnit(state,'p1',{name:make('C058').name},()=>{},target.id,false);
      assert.equal(child.atk,make('C058').power);coreTransformUnit(state,child,make('C011').name,()=>{});
      assert.equal(child.atk,make('C011').power);assert.equal(child.desc,make('C011').desc);
      const def=make('C011'),shownCard={...runLevelBattleCard(make('C058')),desc:`開戦：「${def.name}」に変身する。`};
      assert.ok(_rawSubstitutedDesc(shownCard,child).includes(`${def.power}/${def.life}の「${def.name}」`),'召喚体の変身先注釈へ本体レベルを掛けない');
    });
    fresh({atk:2,hp:5});
    await check('沈黙中の眷属：薄いコアstateの作り直し・変身でも本体レベルを掛けない',()=>{
      const state=stateFor([formed(make('C006'))]),child=coreSummonUnit(state,'p1',{name:make('C058').name},()=>{},null,false);
      coreSilenceUnit(child);const atk=child.atk,hp=child.maxHp;
      assert.equal(coreApplyUnitRunLevels(child,G.runLevels.values),child);
      coreInitializeBattleState(state);assert.equal(child.atk,atk);assert.equal(child.maxHp,hp);
      coreTransformUnit(state,child,make('C011').name,()=>{});
      assert.equal(child.atk,make('C011').power);assert.equal(child.maxHp,make('C011').life);
    });
    fresh({atk:2,hp:5});
    await check('旧直接召喚と地形NPC：所持・未所持とも眷属は倍率なし、初期配置NPCは本体だけに適用',async()=>{
      const hero=make('C058'),enchant=make('E034');hero.directions=['left'];enchant.directions=['right'];
      G.mainBoard[1]=hero;G.mainBoard[0]=enchant;G.allies=[];
      const after=_afterPanelSummon;_afterPanelSummon=async()=>{};
      try{
        const owned=await _spawnAdhocAllyUnit(hero.name,1,1,false,{deferCompact:true});assert.ok(owned);
        assert.equal(owned.atk,hero.power+8);assert.equal(owned.maxHp,hero.life-3);assert.match(owned.desc,/4ダメージ/);
        assert.deepEqual(G.mainBoard[1],hero);assert.equal(hero._runLevelsApplied,undefined);
        G.mainBoard.fill(null);G.allies=[];
        const unowned=await _spawnAdhocAllyUnit(hero.name,1,1,false,{deferCompact:true});assert.ok(unowned);
        assert.equal(unowned.atk,hero.power);assert.equal(unowned.maxHp,hero.life);assert.match(unowned.desc,/4ダメージ/);
        const npc=_placeTerrainNpcAt(6,{name:'外部NPC',atk:2,hp:5,desc:'攻撃：このキャラクターは+1/+1を得る。'});
        assert.equal(npc.atk,4);assert.equal(npc.maxHp,25);assert.match(npc.desc,/\+1\/\+1/);
        const state=_createPveCoreState();assert.equal(state.units.p1.find(u=>u&&u.id===npc.id),npc);assert.equal(npc.atk,4);
      }finally{_afterPanelSummon=after;}
    });
    fresh({atk:2,hp:5});
    await check('復活・呼び戻し：適用済みは能力・効果を保ち、敵の素の体にも新たに掛けない',()=>{
      const u=formed(make('C058')),state=stateFor([u]);
      const spec={...coreUnitSnapshot(state.units.p1[0]),_revivedFromDead:true,hp:2,maxHp:2,atk:4};
      const revived=coreSummonUnit(state,'p1',spec,()=>{},u.id,false);
      assert.equal(revived.atk,4);assert.equal(revived.maxHp,2);assert.match(revived.desc,/4ダメージ/);
      const enemy=coreSummonUnit(state,'p1',{name:'敵から呼び戻し',atk:2,hp:3,maxHp:3,desc:'攻撃：全ての敵に4ダメージを与える。',_revivedFromDead:true},()=>{},u.id,false);
      assert.equal(enemy.atk,2);assert.equal(enemy.maxHp,3);assert.match(enemy.desc,/4ダメージ/);
    });
    fresh({atk:2,hp:5});
    await check('指輪・アイテム：ダメージは据え置き、召喚体の能力・効果も据え置き',()=>{
      const ring=RING_POOL.find(c=>c.name==='不死の指輪'),pain=RING_POOL.find(c=>c.name==='苦行の指輪');
      assert.equal(runLevelDisplayCard(pain),pain);assert.match(_rawSubstitutedDesc(pain),/1ダメージ/);
      const note=_rawSubstitutedDesc(ring).match(/(\d+)\/(\d+)の「青スケルトン」/);assert.ok(note);
      const state=stateFor([formed(make('C006'))]),child=coreSummonUnit(state,'p1',{name:'青スケルトン',color:'青'},()=>{},'undying-ring');
      assert.equal(child.atk,Number(note[1]));assert.equal(child.hp,Number(note[2]));
      state.items={p1:[{id:'illusion',itemEffectKey:'illusion_scroll'}],p2:[]};
      const events=[];coreApplyOpeningItems(state,createSeededRng(1),e=>events.push(e),()=>{});
      const summons=events.filter(e=>e.type==='summon');assert.equal(summons.length,3);
      summons.forEach(e=>{assert.equal(e.unit.atk,20);assert.equal(e.unit.hp,20);});
      for(const c of [...RING_POOL,...ITEM_POOL]) assert.equal(runLevelDisplayCard(c),c);
    });
    fresh();
    await check('レベル1：全カードの本文・カードHTML・詳細説明が変更前と完全一致',()=>{
      const old=execFileSync('git',['show','647d175:prototype/js/engine/render.js'],{encoding:'utf8'});
      const raw=baselineFunction(old,'_rawSubstitutedDesc'),mk=baselineFunction(old,'mkCardEl');
      const collection=baselineFunction(execFileSync('git',['show','647d175:prototype/js/engine/collection.js'],{encoding:'utf8'}),'_collectionDescriptionHtml');
      // 結界は数を出さない（2026-10-21 利用者指定）。変更前の「結界N」だけ「結界」に読み替えて比べる。
      // グリマルキンの（あとX戦）は残りの戦闘数で出す（2026-10-23 利用者指摘）。変更前の X だけ読み替えて比べる。
      const shieldText0=v=>v==null?v:String(v).replace(/結界\d+/g,'結界');
      for(const card of [...PANEL_POOL,...RING_POOL,...ITEM_POOL]){
        const shieldText=v=>v==null?v:_battleEndCountdownDescription(card,shieldText0(v));
        assert.equal(_rawSubstitutedDesc(card),shieldText(raw(card)),card.name);
        const a=mkCardEl(card,0,'reward'),b=mk(card,0,'reward');assert.equal(a.innerHTML,shieldText(b.innerHTML),card.name);
        // ホバーの属性は元の本文のまま持ち、描く時（_formatPreviewHtml）に「結界」へ直す。
        const beforePreview=shieldText(b.getAttribute('data-preview'));
        // fixes-1027d：アイテムの召喚説明もキャラクターと同じ注釈を表示する。
        const expectedPreview=ITEM_POOL.includes(card)&&/召喚/.test(card.desc||'')?_annotateSummonNames(beforePreview,card):beforePreview;
        assert.equal(shieldText(a.getAttribute('data-preview')),expectedPreview,card.name);
        assert.equal(_collectionDescriptionHtml(card),shieldText(collection(card)),card.name);
      }
      const oldBattle=execFileSync('git',['show','647d175:prototype/js/engine/battle.js'],{encoding:'utf8'});
      const oldSpec=baselineFunction(oldBattle,'_panelSummonSpec'),oldUnit=baselineFunction(oldBattle,'_makePanelSummonUnit');
      const blessed=make('C058');coreApplyCardBoon(blessed,{statMul:3,dmgMul:3,famMul:3,modDelta:1});
      assert.deepEqual(_panelSummonSpec(blessed),oldSpec(blessed));
      const a=_makePanelSummonUnit(_panelSummonSpec(blessed),[]),b=oldUnit(oldSpec(blessed),[]);a.id=b.id;assert.deepEqual(a,b);
    });
    fresh({atk:3,hp:5});
    await check('敵とオンライン：高レベルでも本文・ATK/HP・詳細・送信形は従来のまま',()=>{
      const card=make('C058'),enemy={...card,_sheetEnemy:true,side:'p2'};
      assert.equal(runLevelDisplayCard(enemy),enemy);assert.match(_rawSubstitutedDesc(enemy),/4ダメージ/);
      assert.equal(metrics(mkCardEl(enemy,0,'enemy')).atk,card.power);
      assert.match(_collectionDescriptionHtml(enemy,'enemy'),/4ダメージ/);
      const enchant=make('E008'),enemyOwner={side:'p2',boardCards:[enemy,enchant]};
      assert.equal(_enchantEffectTextForPanel(enchant,enemyOwner),enchant.desc);
      const summonEnchant={...make('E028'),desc:make('C060').desc};
      const enemySummonText=_enchantEffectTextForPanel(summonEnchant,enemyOwner);
      G._onlineMode=true;assert.equal(_enchantEffectTextForPanel(summonEnchant,enemyOwner),enemySummonText);
      assert.equal(runLevelDisplayCard(card),card);
      const m=metrics(mkCardEl(card,0,'reward'));assert.equal(m.atk,card.power);assert.match(m.desc,/4ダメージ/);
      assert.deepEqual(runLevelCoreFields(),{});const payload=buildOnlineSelfFormation();assert.equal('runLevels' in payload,false);
    });
    fresh({atk:2,hp:5});
    await check('レベル報酬：表示中のカード・魔導板・詳細を新しいATK/HPで描き直し、再抽選なし',()=>{
      const card=make('C058');G.mainBoard[1]=card;const render={rew:renderRewCards,hand:renderHandEditor,all:renderAll};let shown;
      renderRewCards=()=>{shown=metrics(mkCardEl(card,0,'reward'));};
      renderHandEditor=()=>{board();detail(card);};
      renderAll=()=>renderHandEditor();
      try{
        assert.equal(runLevelOpenVictoryReward('elite',false),true);assert.ok(shown);
        assert.equal(shown.atk,card.power*G.runLevels.values.atk);assert.equal(shown.hp,card.life*G.runLevels.values.hp);
        assert.match(shown.desc,/4ダメージ/);assert.equal(towerBoonRerollButtonState().visible,false);
        assert.equal(metrics(ids.get('hand-slots').children[1]).atk,shown.atk);
        assert.equal(ids.get('collection-card-stats').textContent,`ATK${shown.atk} / HP${shown.hp}`);
        for(const spec of RUN_LEVEL_CONFIG.rewards){
          const before={atk:1,hp:1},after={atk:1+spec.gains.atk,hp:1+spec.gains.hp};
          G.runLevels.reward={...spec,before,after,active:true};const row=element('div');runLevelRenderReward(row);
          const [heading,values]=row.children[0].children;
          assert.equal(heading.textContent,Object.entries(RUN_LEVEL_CONFIG.names).filter(([k])=>spec.gains[k]).map(([k,n])=>`${n} +${spec.gains[k]}`).join('・'));
          assert.equal(values.textContent,`ATKレベル 1 → ${after.atk} ／ HPレベル 1 → ${after.hp}`);
          assert.equal(row.children[0].children.length,2);
        }
        G.runLevels=runLevelNormalizeState({values:{stats:4,familiars:9,modifiers:8,damage:7},reward:{active:true}});
        const row=element('div');runLevelRenderReward(row);
        assert.equal(row.children[0].children[0].textContent,RUN_LEVEL_CONFIG.receivedTitle);
        assert.equal(row.children[0].children[1].textContent,'ATKレベル 4 ／ HPレベル 4');
      }finally{renderRewCards=render.rew;renderHandEditor=render.hand;renderAll=render.all;}
    });
    fresh({atk:3,hp:5});
    await check('保存→ロードと終了画面：魔導板・報酬・商品は素のまま、描き直しでも二重に掛けない',()=>{
      const card=make('C058');G.mainBoard[1]=card;_rewCards=[make('E008')];
      _capturePlacementStart();
      const stock=clone(_ensureWaveShopStock());
      for(const c of stock.filter(Boolean)){assert.equal(c._runLevelsApplied,undefined);mkCardEl(c,0,'shop');}
      const raw=clone(G.mainBoard),offers=clone(_rewCards);const before=metrics(board());detail(card);
      const save=SaveRun.buildRunSave('reward');SaveRun.validate(save);SaveRun.restoreRunState(clone(save));
      assert.deepEqual(G.mainBoard,raw);assert.deepEqual(_rewCards,offers);assert.equal(G.mainBoard[1]._runLevelsApplied,undefined);
      assert.deepEqual(_ensureWaveShopStock(),stock);
      assert.deepEqual(metrics(board()),before);
      G.phase='gameover';renderGameOverBoard();const clonePane=ids.get('gameover-board-grid').children[1];
      assert.ok(clonePane);assert.deepEqual(metrics(clonePane.children[0].children[1]),before);assert.deepEqual(G.mainBoard,raw);
      assert.deepEqual(metrics(mkCardEl(G.mainBoard[1],0,'reward')),metrics(mkCardEl(runLevelDisplayCard(G.mainBoard[1]),0,'reward')));
    });
    await check('懺悔：レベルでは自傷も敵ダメージも不変、旧祝福の倍率は保持',()=>{
      const card=make('E075');assert.equal(runLevelDisplayCard(card),card);
      assert.equal(corePermanentDamageValue(card),12);
      const boon={...CORE_BOON_FIELDS,dmgMul:3};
      assert.equal(coreBoonText('攻撃：このキャラクターは1ダメージを2回受ける。',boon),'攻撃：このキャラクターは3ダメージを2回受ける。');
      assert.equal(coreBoonText('攻撃：ランダムな敵に4ダメージを与える。',boon),'攻撃：ランダムな敵に12ダメージを与える。');
    });
  }finally{document.createElement=previous.create;document.getElementById=previous.get;SaveProfile.collectionState=previous.collectionState;}
  RUN_LEVEL_CONFIG.rewardEnabled=false;
  console.log(`レベル表示1019：${checked}項目 OK（ブラウザの見た目は未確認）`);
}
if(require.main===module) initialize().then(testRunLevelDisplay).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testRunLevelDisplay};
