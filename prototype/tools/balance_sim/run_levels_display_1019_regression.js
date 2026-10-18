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
      fresh({stats:level,familiars:level,modifiers:level,damage:level});
      await check(`レベル${level}：報酬・魔導店・行商人・デバッグ・魔導板・詳細のATK/HPと固定ダメージが一致`,()=>{
        const card=make('C043'),raw=clone(card);
        for(const ctx of ['reward','shop','peddler','debug-palette']){
          G._isShop=ctx==='shop'||ctx==='peddler';G._isPeddler=ctx==='peddler';
          const node=ctx==='reward'||G._isShop?_mkRewDiv(card,null,0):mkCardEl(card,-1,ctx),m=metrics(node);
          assert.equal(m.atk,raw.power*level,ctx);assert.equal(m.hp,raw.life*level,ctx);assert.ok(m.desc.includes(`${4*level}ダメージ`),ctx);
        }
        G._isShop=false;G._isPeddler=false;
        const unit=formed(card),m=metrics(board()),d=detail(card);
        assert.equal(m.atk,unit.atk);assert.equal(m.hp,unit.maxHp);assert.ok(m.desc.includes(`${4*level}ダメージ`));
        assert.equal(d.stats,`ATK${unit.atk} / HP${unit.maxHp}`);assert.ok(d.desc.includes(`${4*level}ダメージ`));
        assert.ok(fight(stateFor([unit])).some(e=>e.type==='damage'&&e.sourceId===unit.id&&e.damageKind==='attack_effect'&&e.amount===4*level));
        assert.deepEqual(card,raw,'表示・戦闘でカードへ焼き込まない');
      });
      fresh({stats:level,familiars:level,modifiers:level,damage:level});
      await check(`レベル${level}：戦闘修正・接続強化・詳細・ツールチップの数値とコアが一致`,()=>{
        const hero=make('C006'),enchant=make('E034'),unit=formed(hero,enchant),m=metrics(board());
        assert.equal(m.atk,hero.power*level+8*level);assert.equal(m.hp,hero.life*level-3*level);
        assert.equal(m.atk,unit.atk);assert.equal(m.hp,unit.maxHp);
        assert.ok(m.desc.includes(`+${level}/+${level}`));assert.ok(m.desc.includes(`+${8*level}/-${3*level}`));
        assert.ok(_collectionDescriptionHtml(enchant,'enchant').includes(`+${8*level}/-${3*level}`));
        assert.ok(mkCardEl(enchant,-1,'reward').getAttribute('data-preview').includes(`+${8*level}/-${3*level}`));
        const e=fight(stateFor([unit])).find(e=>e.type==='stat_change'&&e.reason==='attack_self_buff');
        assert.ok(e);assert.equal(e.atk,level);assert.equal(e.hp,level);
        const damage=make('E008'),caster=formed(make('C001'),damage);
        assert.ok(_rawSubstitutedDesc(damage).includes(`${8*level}ダメージ`));
        assert.ok(_unitPreviewText(caster,_rawSubstitutedDesc(caster),0).includes(`${8*level}ダメージ`));
        assert.ok(fight(stateFor([caster])).some(e=>e.type==='damage'&&e.damageKind==='attack_effect'&&e.amount===8*level));
      });
      fresh({stats:level,familiars:level,modifiers:level,damage:level});
      await check(`レベル${level}：眷属の注釈・固定コピーの説明と召喚結果、コピーの効果は一度だけ`,()=>{
        const card=make('C045'),unit=formed(card),desc=_rawSubstitutedDesc(card);
        const shown=desc.match(/(\d+)\/(\d+)の「緑ペリカン」/);assert.ok(shown,desc);
        const summons=fight(stateFor([unit])).filter(e=>e.type==='summon'&&e.side==='p1');assert.equal(summons.length,2);
        for(const e of summons){assert.equal(e.unit.atk,Number(shown[1]));assert.equal(e.unit.hp,Number(shown[2]));}
        const copy=make('E028'),caster=formed(make('C043'),copy);
        assert.ok(_rawSubstitutedDesc(copy).includes(`${level}/${level}のコピー`));
        const state=stateFor([caster]),events=fight(state),child=events.find(e=>e.type==='summon').unit;
        assert.equal(child.atk,level);assert.equal(child.hp,level);assert.equal(child.desc,`攻撃：全ての敵に${4*level}ダメージを与える。`);
        assert.equal(child.boon.dmgMul,level);
        assert.equal(coreApplyUnitRunLevels(child,G.runLevels.values),child);
      });
    }
    fresh({stats:2,familiars:3,modifiers:3,damage:2});
    await check('X・正負・ゼロ・ATK奪取・回数：対象の数値だけを変え、定義と回数を保持',()=>{
      const caster=make('C019');assert.match(_rawSubstitutedDesc(caster),/\(X×2\)ダメージ/);
      const u=formed(caster),ev=fight(stateFor([u],{resources:{p1:{mana:4}}}));
      assert.ok(ev.some(e=>e.type==='damage'&&e.sourceId===u.id&&e.damageKind==='attack_effect'&&e.amount===8));
      assert.match(_rawSubstitutedDesc(make('E036')),/ATK\+\(X×3\)/);
      const card=make('C006');card.desc='ATK+2 HP-1 +0/-2 ATKを2奪う。4ダメージを2回与える。';
      assert.equal(_rawSubstitutedDesc(card),'ATK+6 HP-3 +0/-6 ATKを6奪う。8ダメージを2回与える。');
    });
    fresh({stats:2,familiars:3,modifiers:2,damage:3});
    await check('クエスト配布・依頼カード：生成時は素のまま、提示・盤面・詳細で現在レベル',()=>{
      const required=_qMakeRequiredCard({questId:'Q001'});assert.ok(required);assert.equal(required.no,'E075');
      assert.equal(corePermanentDamageValue(required),12);assert.match(_mkRewDiv(required,null,0).getAttribute('data-preview'),/36ダメージ/);
      const offer=_qMakeRequiredCard({questId:'Q006'});assert.ok(offer);
      const raw=clone(offer),m=metrics(mkCardEl(offer,0,'quest'));
      assert.equal(m.atk,raw.power*2);assert.equal(m.hp,raw.life*2);assert.deepEqual(offer,raw);
    });
    fresh({stats:2,familiars:3,modifiers:2,damage:3});
    await check('編成外の初期配置・変身・敵の奪取：能力値・本体効果・接続効果が現在レベル',()=>{
      const external={id:'external',name:'外部配置',atk:3,hp:8,maxHp:8,desc:'攻撃：このキャラクターは+2/+1を得る。'};
      const raw=clone(external),state=stateFor([external]);assert.equal(state.units.p1[0].atk,6);assert.equal(state.units.p1[0].maxHp,16);
      assert.match(state.units.p1[0].desc,/\+4\/\+2/);assert.deepEqual(external,raw);
      const target=state.units.p1[0];coreTransformUnit(state,target,make('C043').name,()=>{});
      assert.equal(target.atk,make('C043').power*2);assert.match(target.desc,/12ダメージ/);
      assert.match(_rawSubstitutedDesc(target),/12ダメージ/);
      const stolen=state.units.p2[0];stolen.desc='攻撃：全ての敵に4ダメージを与える。';
      stolen._adjacentPanelEffectTexts=['攻撃：このキャラクターは+2/+1を得る。'];
      const atk=stolen.atk,hp=stolen.maxHp;const events=[];
      assert.equal(coreStealUnit(state,stolen,'p1',e=>events.push(e),target.id),true);
      assert.equal(stolen.atk,atk*2);assert.equal(stolen.maxHp,hp*2);assert.match(stolen.desc,/12ダメージ/);
      assert.match(stolen._adjacentPanelEffectTexts[0],/\+4\/\+2/);assert.equal(stolen._useEnemyVisualFrame,true);
      assert.equal(events.at(-1).unit.atk,stolen.atk);assert.equal(coreApplyUnitRunLevels(stolen,G.runLevels.values),stolen);
      const child=coreSummonUnit(state,'p1',{name:make('C043').name},()=>{},target.id,false);
      assert.equal(child.atk,make('C043').power*3);coreTransformUnit(state,child,make('C006').name,()=>{});
      assert.equal(child.atk,make('C006').power*3);assert.match(child.desc,/\+2\/\+2/);
    });
    fresh({stats:2,familiars:3,modifiers:2,damage:3});
    await check('旧直接召喚と地形NPC：所持・未所持とも基礎能力だけに掛け、強化へ眷属倍率を重ねない',async()=>{
      const hero=make('C043'),enchant=make('E034');hero.directions=['left'];enchant.directions=['right'];
      G.mainBoard[1]=hero;G.mainBoard[0]=enchant;G.allies=[];
      const after=_afterPanelSummon;_afterPanelSummon=async()=>{};
      try{
        const owned=await _spawnAdhocAllyUnit(hero.name,1,1,false,{deferCompact:true});assert.ok(owned);
        assert.equal(owned.atk,hero.power*3+8*2);assert.equal(owned.maxHp,hero.life*3-3*2);assert.match(owned.desc,/12ダメージ/);
        assert.deepEqual(G.mainBoard[1],hero);assert.equal(hero._runLevelsApplied,undefined);
        G.mainBoard.fill(null);G.allies=[];
        const unowned=await _spawnAdhocAllyUnit(hero.name,1,1,false,{deferCompact:true});assert.ok(unowned);
        assert.equal(unowned.atk,hero.power*3);assert.equal(unowned.maxHp,hero.life*3);assert.match(unowned.desc,/12ダメージ/);
        const npc=_placeTerrainNpcAt(6,{name:'外部NPC',atk:2,hp:5,desc:'攻撃：このキャラクターは+1/+1を得る。'});
        assert.equal(npc.atk,4);assert.equal(npc.maxHp,10);assert.match(npc.desc,/\+2\/\+2/);
        const state=_createPveCoreState();assert.equal(state.units.p1.find(u=>u&&u.id===npc.id),npc);assert.equal(npc.atk,4);
      }finally{_afterPanelSummon=after;}
    });
    fresh({stats:2,familiars:3,modifiers:2,damage:3});
    await check('復活・呼び戻し：適用済みは能力・効果を保ち、敵の素の体にも一度だけ適用',()=>{
      const u=formed(make('C043')),state=stateFor([u]);
      const spec={...coreUnitSnapshot(state.units.p1[0]),_revivedFromDead:true,hp:2,maxHp:2,atk:4};
      const revived=coreSummonUnit(state,'p1',spec,()=>{},u.id,false);
      assert.equal(revived.atk,4);assert.equal(revived.maxHp,2);assert.match(revived.desc,/12ダメージ/);
      const enemy=coreSummonUnit(state,'p1',{name:'敵から呼び戻し',atk:2,hp:3,maxHp:3,desc:'攻撃：全ての敵に4ダメージを与える。',_revivedFromDead:true},()=>{},u.id,false);
      assert.equal(enemy.atk,4);assert.equal(enemy.maxHp,6);assert.match(enemy.desc,/12ダメージ/);
    });
    fresh({stats:2,familiars:3,modifiers:2,damage:3});
    await check('指輪・アイテム：ダメージは据え置き、召喚体は眷属レベル、召喚体の効果は効果威力',()=>{
      const ring=RING_POOL.find(c=>c.name==='不死の指輪'),pain=RING_POOL.find(c=>c.name==='苦行の指輪');
      assert.equal(runLevelDisplayCard(pain),pain);assert.match(_rawSubstitutedDesc(pain),/1ダメージ/);
      const note=_rawSubstitutedDesc(ring).match(/(\d+)\/(\d+)の「青スケルトン」/);assert.ok(note);
      const state=stateFor([formed(make('C001'))]),child=coreSummonUnit(state,'p1',{name:'青スケルトン',color:'青'},()=>{},'undying-ring');
      assert.equal(child.atk,Number(note[1]));assert.equal(child.hp,Number(note[2]));
      state.items={p1:[{id:'illusion',itemEffectKey:'illusion_scroll'}],p2:[]};
      const events=[];coreApplyOpeningItems(state,createSeededRng(1),e=>events.push(e),()=>{});
      const summons=events.filter(e=>e.type==='summon');assert.equal(summons.length,3);
      summons.forEach(e=>{assert.equal(e.unit.atk,60);assert.equal(e.unit.hp,60);});
      for(const c of [...RING_POOL,...ITEM_POOL]) assert.equal(runLevelDisplayCard(c),c);
    });
    fresh();
    await check('レベル1：全カードの本文・カードHTML・詳細説明が変更前と完全一致',()=>{
      const old=execFileSync('git',['show','b76c6e8:prototype/js/engine/render.js'],{encoding:'utf8'});
      const raw=baselineFunction(old,'_rawSubstitutedDesc'),mk=baselineFunction(old,'mkCardEl');
      const collection=baselineFunction(execFileSync('git',['show','b76c6e8:prototype/js/engine/collection.js'],{encoding:'utf8'}),'_collectionDescriptionHtml');
      for(const card of [...PANEL_POOL,...RING_POOL,...ITEM_POOL]){
        assert.equal(_rawSubstitutedDesc(card),raw(card),card.name);
        const a=mkCardEl(card,0,'reward'),b=mk(card,0,'reward');assert.equal(a.innerHTML,b.innerHTML,card.name);
        assert.equal(a.getAttribute('data-preview'),b.getAttribute('data-preview'),card.name);
        assert.equal(_collectionDescriptionHtml(card),collection(card),card.name);
      }
      const oldBattle=execFileSync('git',['show','b76c6e8:prototype/js/engine/battle.js'],{encoding:'utf8'});
      const oldSpec=baselineFunction(oldBattle,'_panelSummonSpec'),oldUnit=baselineFunction(oldBattle,'_makePanelSummonUnit');
      const blessed=make('C043');coreApplyCardBoon(blessed,{statMul:3,dmgMul:3,famMul:3,modDelta:1});
      assert.deepEqual(_panelSummonSpec(blessed),oldSpec(blessed));
      const a=_makePanelSummonUnit(_panelSummonSpec(blessed),[]),b=oldUnit(oldSpec(blessed),[]);a.id=b.id;assert.deepEqual(a,b);
    });
    fresh({stats:3,familiars:3,modifiers:3,damage:3});
    await check('敵とオンライン：高レベルでも本文・ATK/HP・詳細・送信形は従来のまま',()=>{
      const card=make('C043'),enemy={...card,_sheetEnemy:true,side:'p2'};
      assert.equal(runLevelDisplayCard(enemy),enemy);assert.match(_rawSubstitutedDesc(enemy),/4ダメージ/);
      assert.equal(metrics(mkCardEl(enemy,0,'enemy')).atk,card.power);
      assert.match(_collectionDescriptionHtml(enemy,'enemy'),/4ダメージ/);
      const enchant=make('E008'),enemyOwner={side:'p2',boardCards:[enemy,enchant]};
      assert.match(_enchantEffectTextForPanel(enchant,enemyOwner),/8ダメージ/);
      const summonEnchant={...make('E028'),desc:make('C045').desc};
      const enemySummonText=_enchantEffectTextForPanel(summonEnchant,enemyOwner);
      G._onlineMode=true;assert.equal(_enchantEffectTextForPanel(summonEnchant,enemyOwner),enemySummonText);
      assert.equal(runLevelDisplayCard(card),card);
      const m=metrics(mkCardEl(card,0,'reward'));assert.equal(m.atk,card.power);assert.match(m.desc,/4ダメージ/);
      assert.deepEqual(runLevelCoreFields(),{});const payload=buildOnlineSelfFormation();assert.equal('runLevels' in payload,false);
    });
    fresh({stats:2,familiars:3,modifiers:2,damage:3});
    await check('レベル報酬と再抽選：表示中の報酬・魔導板・詳細を新しいレベルで描き直せる',()=>{
      const card=make('C043');G.mainBoard[1]=card;const render={rew:renderRewCards,hand:renderHandEditor};let shown;
      renderRewCards=()=>{shown=metrics(mkCardEl(card,0,'reward'));};
      renderHandEditor=()=>{board();detail(card);};
      try{
        assert.equal(runLevelOpenVictoryReward('elite',false),true);assert.ok(shown);
        assert.equal(shown.atk,card.power*G.runLevels.values.stats);
        towerBoonState().rerolls=1;
        assert.equal(runLevelRerollReward(),true);assert.ok(shown);
        assert.equal(shown.atk,card.power*G.runLevels.values.stats);assert.match(shown.desc,new RegExp(`${4*G.runLevels.values.damage}ダメージ`));
        assert.equal(metrics(ids.get('hand-slots').children[1]).atk,shown.atk);
        assert.equal(ids.get('collection-card-stats').textContent,`ATK${shown.atk} / HP${shown.hp}`);
      }finally{renderRewCards=render.rew;renderHandEditor=render.hand;}
    });
    fresh({stats:3,familiars:2,modifiers:3,damage:2});
    await check('保存→ロードと終了画面：魔導板・報酬・商品は素のまま、描き直しでも二重に掛けない',()=>{
      const card=make('C043');G.mainBoard[1]=card;_rewCards=[make('E008')];
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
    await check('懺悔の自傷も効果威力レベルで表示と戦闘が同じ値になる（本文へ書き込んだ数値をコアが読む）',()=>{
      const boon=coreApplyCardRunLevels({id:'p',name:'懺悔',desc:''},{stats:1,familiars:1,modifiers:1,damage:3}).boon;
      assert.equal(coreBoonText('攻撃：このキャラクターは1ダメージを2回受ける。',boon),'攻撃：このキャラクターは3ダメージを2回受ける。');
      assert.equal(coreBoonText('攻撃：ランダムな敵に4ダメージを与える。',boon),'攻撃：ランダムな敵に12ダメージを与える。');
    });
  }finally{document.createElement=previous.create;document.getElementById=previous.get;SaveProfile.collectionState=previous.collectionState;}
  console.log(`レベル表示1019：${checked}項目 OK（ブラウザの見た目は未確認）`);
}
if(require.main===module) initialize().then(testRunLevelDisplay).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testRunLevelDisplay};
