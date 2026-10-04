'use strict';

// 刻印6種と塔「五聖の座」の実ブラウザ回帰検査。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
const {launch}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const checks=[];
const check=(name,value,detail='')=>checks.push({name,ok:!!value,detail});

(async()=>{
  const browser=await launch({width:1600,height:900});
  try{
    await browser.goto(URL,2500);
    await browser.waitFor(`typeof G!=='undefined'&&Array.isArray(PANEL_POOL)
      &&typeof coreRunOpening==='function'&&typeof simulateOnlineBattle==='function'
      &&typeof fiveSaintsShouldAdvanceToStageFive==='function'`,30000);

    const result=await browser.eval(`
      const noOf=card=>String(card&&(card.no||card.No||card['No.']||card.artCode)||'').toUpperCase();
      const engravingNos=['E066','E076','E077','E078','E079','E080'];
      const defs=Object.fromEntries(engravingNos.map(no=>[no,PANEL_POOL.find(card=>noOf(card)===no)]));
      const cards=Object.fromEntries(engravingNos.map(no=>[no,defs[no]?makePanel(defs[no].id||defs[no].name):null]));
      const descriptions={};
      for(const stage of [1,4]){
        G._wave=stage;
        descriptions[stage]=Object.fromEntries(engravingNos.map(no=>[no,cards[no]?_plainEffectTextForPreview(cards[no]):'']));
      }
      const keywordRows=Object.fromEntries(engravingNos.map(no=>[no,cards[no]?_enchantPreviewKeywords(cards[no]):[]]));

      const stageEffects=stage=>{
        const make=(id,effects,extra={})=>({id,name:id,atk:100,hp:100,maxHp:100,
          // 再開データに古い値が残っていても、stateの現在ステージが優先されることも同時に見る。
          _stageNumber:1,effectData:{effectNames:effects.slice(),effectTexts:[]},...extra});
        const runOpening=()=>{
          const rng=createSeededRng(100+stage),events=[];
          const state=createBattleState({stageNumber:stage,
            resources:{p1:{mana:0,gold:200},p2:{mana:0,gold:0}},
            sides:{p1:{units:[make('fate',['宿業の刻印'])]},p2:{units:[make('foe',[],{atk:1})]}}});
          const emit=event=>events.push(event);
          const hit=(source,target,amount,counter,_a,_b,opt)=>coreResolveHit(state,source,target,amount,counter,rng,emit,opt||{});
          coreRunOpening(state,rng,emit,hit,()=>{});
          const unit=state.units.p1[0];
          return {atk:unit.atk,hp:unit.hp,maxHp:unit.maxHp,
            change:events.find(event=>event.reason==='fate_engraving')||null};
        };
        const runAttack=()=>{
          const rng=createSeededRng(200+stage),events=[];
          const state=createBattleState({stageNumber:stage,
            sides:{p1:{units:[make('discipline',['修道の刻印']),make('ally',[])]},p2:{units:[make('foe',[])]}}});
          const emit=event=>events.push(event);
          const hit=(source,target,amount,counter,_a,_b,opt)=>coreResolveHit(state,source,target,amount,counter,rng,emit,opt||{});
          coreApplyAttackEffects(state.units.p1[0],state,rng,emit,hit,'engraving-check');
          return {atk:state.units.p1.map(unit=>unit.atk),changes:events.filter(event=>event.reason==='discipline_engraving').length};
        };
        const runDeath=()=>{
          const rng=createSeededRng(300+stage),events=[];
          const state=createBattleState({stageNumber:stage,
            resources:{p1:{mana:0,gold:200},p2:{mana:0,gold:0}},
            sides:{p1:{units:[make('dead',['受難の刻印','苦悶の刻印']),make('ally',[])]},p2:{units:[]}}});
          const emit=event=>events.push(event);
          const hit=(source,target,amount,counter,_a,_b,opt)=>coreResolveHit(state,source,target,amount,counter,rng,emit,opt||{});
          state.units.p1[0].hp=0;
          coreTriggerDeath(state.units.p1[0],state,emit);
          coreApplyDeathEffects(state.units.p1[0],state,rng,emit,hit);
          return {allyHp:state.units.p1[1].hp,gold:state.resources.p1.gold,
            damage:events.find(event=>event.type==='damage'&&event.unitId==='ally')?.amount||0,
            goldSpend:events.find(event=>event.type==='gold_spend')?.amount||0};
        };
        const sealState=createBattleState({stageNumber:stage,
          sides:{p1:{units:[make('patience',['我慢の刻印'])]},p2:{units:[]}}});
        return {opening:runOpening(),attack:runAttack(),death:runDeath(),seal:coreSealValue(sealState.units.p1[0])};
      };

      // オンラインの薄い入口と直接コア呼び出しが同じ入力・乱数で完全一致することも見る。
      const paritySetup={seed:9147,stageNumber:4,mapIndex:4,turnLimit:6,
        resources:{p1:{mana:0,gold:200},p2:{mana:0,gold:0}},
        sides:{
          p1:{units:[
            {id:'fate',name:'味方A',atk:80,hp:80,maxHp:80,effectData:{effectNames:['宿業の刻印'],effectTexts:[]}},
            {id:'discipline',name:'味方B',atk:20,hp:80,maxHp:80,effectData:{effectNames:['修道の刻印'],effectTexts:[]}},
          ]},
          p2:{units:[{id:'enemy',name:'敵',atk:8,hp:160,maxHp:160}]},
        }};
      const directState=createBattleState(paritySetup),directEvents=[];
      const directResult=runBattleCore(directState,createSeededRng(paritySetup.seed),{
        turnLimit:paritySetup.turnLimit,onEvent:event=>directEvents.push(event)});
      const onlineResult=simulateOnlineBattle(paritySetup);
      const direct={events:directEvents,outcome:directResult.outcome,endReason:directResult.endReason,
        turns:directResult.turns,finalState:battleCoreFinalState(directState)};
      const online={events:onlineResult.events,outcome:onlineResult.outcome,endReason:onlineResult.endReason,
        turns:onlineResult.turns,finalState:onlineResult.finalState};

      // 刻印は売却・還魂・報酬枠返却の各入口と、ボタン表示の両方で拒否する。
      G.phase='reward';G._isShop=true;G._isForge=false;G._isWaveAltar=false;G._debugMode=false;
      G.mainBoard=new Array(15).fill(null);G.mainBoard[2]=cards.E066;
      const owner=_getPartyBoardUnit();owner.boardCards=G.mainBoard;
      const sellAllowed=_boardCardSellEnabled(cards.E066);
      const rewardAccepted=_rewardAreaAcceptsCard(cards.E066);
      _rewCards=[];
      const rewardPushed=_pushToRewardArea(cards.E066);
      G._isShop=false;G._isWaveAltar=true;G._ringOfferPhase=true;G._ringOffer=[{name:'検査指輪'}];
      G._ringOfferUnlocked=false;G._ringOfferResolved=false;G._boardDiscardCount=0;G._ringSacrificedCards=[];
      _discardBoardCardForRingOffer(2,cards.E066);
      renderHandEditor();
      const engravingButton=!!document.querySelector('[data-board-idx="2"] .discard-btn,[data-board-idx="2"] .shop-board-sell-action');
      const disposal={sellAllowed,rewardAccepted,rewardPushed,stillOnBoard:G.mainBoard[2]===cards.E066,
        discardCount:G._boardDiscardCount,button:engravingButton};

      // 抑圧の刻印はUIだけでなく、盤面変更の最終判定でも同一オブジェクト・同一マスを要求する。
      const suppression=cards.E076;suppression._fixedBoardSlot=2;
      const filler=makePanel(PANEL_POOL.find(card=>card&&card.category==='キャラクター').id);
      G.mainBoard=new Array(15).fill(null);G.mainBoard[2]=suppression;G.mainBoard[3]=filler;owner.boardCards=G.mainBoard;
      const removed=G.mainBoard.slice();removed[2]=null;
      const swapped=G.mainBoard.slice();swapped[2]=filler;swapped[3]=suppression;
      const unchanged=G.mainBoard.slice();
      renderHandEditor();
      const suppressionEl=document.querySelector('[data-board-idx="2"]');
      G._ringOfferPhase=false;G._isFiveSaints=true;
      _dragSrc={arr:'boardCards',idx:3,unitIdx:G._selectedBoardUnitIdx};
      const fiveRewardSwap=_canReturnDragSrcToRewardArea();
      _dragSrc=null;G._isFiveSaints=false;
      const suppressionMove={removed:_canApplyBoardChange(owner,removed),swapped:_canApplyBoardChange(owner,swapped),
        unchanged:_canApplyBoardChange(owner,unchanged),sameSlot:_canCardUseBoardSlot(suppression,2,owner),
        otherSlot:_canCardUseBoardSlot(suppression,3,owner),draggable:suppressionEl&&suppressionEl.draggable,
        fiveRewardSwap};

      // 地域データ・初回ロック・見出し・ラン内抽選・進行分岐。
      const facilities={};
      const oldClear=SaveProfile.hasClearedRun;
      SaveProfile.hasClearedRun=()=>true;
      for(let wave=1;wave<=4;wave++){
        G._wave=wave;G._isWaveAltar=true;
        facilities[wave]=villageFacilityList().map(fac=>({key:fac.key,name:fac.name,label:fac.label}));
      }
      SaveProfile.hasClearedRun=()=>false;
      G._fiveSaints={visited:false,offeredNos:[],offers:{},decisions:{},targets:{}};
      const locked={disabled:_villageFacilityDisabled({key:'landing'}),desc:villageFacilityDescText('五聖の座')};
      SaveProfile.hasClearedRun=()=>true;
      const unlocked={disabled:_villageFacilityDisabled({key:'landing'}),desc:villageFacilityDescText('五聖の座')};

      G._wave=1;G.mainBoard=new Array(15).fill(null);
      G._fiveSaints={visited:false,offeredNos:[],offers:{},decisions:{},targets:{}};
      const offers=[1,2,3,4].map(wave=>_fiveSaintsOfferNo(wave));
      G._fiveSaints={visited:true,offeredNos:['E076'],offers:{'1':'E076'},decisions:{},targets:{}};
      G.mainBoard[0]=filler;
      const targetA=_fiveSaintsTargetSlot(1,'E076'),targetB=_fiveSaintsTargetSlot(1,'E076');
      const counts=[0,1,2,3].map(count=>fiveSaintsShouldAdvanceToStageFive({decisions:Object.fromEntries(
        Array.from({length:count},(_,i)=>[String(i+1),{accepted:true}]))}));

      const oldGameOver=gameOver,oldOpenWaveVillage=_openWaveVillage;
      const transitions=[];
      gameOver=options=>transitions.push({kind:'clear',clear:!!(options&&options.clear),wave:G._wave});
      _openWaveVillage=(stage,intro)=>transitions.push({kind:'stage5',stage,intro,wave:G._wave});
      G._onlineMode=false;G._wave=4;G._waveStage=_waveRouteForWave(4).length;G._waveResumeStage=null;
      G._fiveSaints={decisions:{'1':{accepted:true}}};_startWaveFlowNext();
      G._wave=4;G._waveStage=_waveRouteForWave(4).length;G._fiveSaints={decisions:{'1':{accepted:true},'3':{accepted:true}}};_startWaveFlowNext();
      gameOver=oldGameOver;_openWaveVillage=oldOpenWaveVillage;
      SaveProfile.hasClearedRun=oldClear;

      const initialRow=_fiveSaintsTalkRow('塔「五聖の座」初回入場時');
      const entryRow=_fiveSaintsTalkRow('塔「五聖の座」入場時');
      const dialogue={initial:_fiveSaintsTalkLines(initialRow,['台詞1','台詞2','台詞3']),
        entry:_fiveSaintsTalkLines(entryRow,['台詞1','台詞2','台詞3','特殊台詞A1','特殊台詞B1'])};

      return {missing:engravingNos.filter(no=>!defs[no]),names:Object.fromEntries(engravingNos.map(no=>[no,defs[no]?.name||''])),
        keywordRows,descriptions,effects1:stageEffects(1),effects4:stageEffects(4),parity:JSON.stringify(direct)===JSON.stringify(online),
        disposal,suppressionMove,facilities,locked,unlocked,
        headings:{screen:fiveSaintsRewardTitle(),slot:fiveSaintsRewardSlotTitle(),
          screenSheet:textMessage('「五聖の座」見出し',''),slotSheet:textMessage('「五聖の座の報酬枠」見出し','')},
        offers,targetA,targetB,counts,transitions,dialogue};
    `);

    check('刻印6種がシートから読み込まれる',result.missing.length===0,JSON.stringify(result.missing));
    check('刻印6種の名称が新仕様',JSON.stringify(result.names)===JSON.stringify({
      E066:'宿業の刻印',E076:'抑圧の刻印',E077:'受難の刻印',E078:'苦悶の刻印',E079:'修道の刻印',E080:'我慢の刻印'}),JSON.stringify(result.names));
    check('刻印6種がキーワード説明経路へ乗る',Object.values(result.keywordRows).every(rows=>rows.includes('刻印')),JSON.stringify(result.keywordRows));
    check('ステージ1の説明文へXを数値展開',result.descriptions[1].E066.includes('-5/-5')
      &&result.descriptions[1].E077.includes('5ダメージ')&&result.descriptions[1].E078.includes('20ゴールド')
      &&result.descriptions[1].E079.includes('ATK-5')&&/封印5/.test(result.descriptions[1].E080),JSON.stringify(result.descriptions[1]));
    check('ステージ4の説明文へXを数値展開',result.descriptions[4].E066.includes('-20/-20')
      &&result.descriptions[4].E077.includes('20ダメージ')&&result.descriptions[4].E078.includes('80ゴールド')
      &&result.descriptions[4].E079.includes('ATK-20')&&/封印20/.test(result.descriptions[4].E080),JSON.stringify(result.descriptions[4]));
    check('宿業・受難・苦悶・修道・我慢がステージ1の値で解決',result.effects1.opening.atk===95
      &&result.effects1.opening.hp===95&&result.effects1.death.damage===5&&result.effects1.death.goldSpend===20
      &&result.effects1.attack.atk.every(value=>value===95)&&result.effects1.seal===5,JSON.stringify(result.effects1));
    check('宿業・受難・苦悶・修道・我慢がステージ4の値で解決',result.effects4.opening.atk===80
      &&result.effects4.opening.hp===80&&result.effects4.death.damage===20&&result.effects4.death.goldSpend===80
      &&result.effects4.attack.atk.every(value=>value===80)&&result.effects4.seal===20,JSON.stringify(result.effects4));
    check('刻印戦闘効果の直接コア／オンライン経路が一致',result.parity);
    check('刻印は売却・還魂・報酬枠返却不可（UIと判定）',!result.disposal.sellAllowed&&!result.disposal.rewardAccepted
      &&!result.disposal.rewardPushed&&result.disposal.stillOnBoard&&result.disposal.discardCount===0&&!result.disposal.button,JSON.stringify(result.disposal));
    check('抑圧の刻印は元マス以外へ移動・交換・除去不可',!result.suppressionMove.removed&&!result.suppressionMove.swapped
      &&result.suppressionMove.unchanged&&result.suppressionMove.sameSlot&&!result.suppressionMove.otherSlot&&!result.suppressionMove.draggable,
      JSON.stringify(result.suppressionMove));
    check('五聖の座では盤面カードと提示刻印を報酬枠経由で交換できない',!result.suppressionMove.fiveRewardSwap,
      JSON.stringify(result.suppressionMove));
    check('4つの塔すべてで五聖の座を施設として読む',[1,2,3,4].every(wave=>result.facilities[wave].some(fac=>fac.key==='landing')),JSON.stringify(result.facilities));
    check('未クリア時だけ五聖の座をロックし再訪時の直下文を使う',result.locked.disabled&&!result.unlocked.disabled
      &&result.locked.desc===await browser.eval(`return textMessage('塔「五聖の座」直下（再訪時）','')`)
      &&result.unlocked.desc===await browser.eval(`return textMessage('塔「五聖の座」直下','')`),JSON.stringify({locked:result.locked,unlocked:result.unlocked}));
    check('画面見出しと報酬枠見出しを別キーから読む',result.headings.screen===result.headings.screenSheet
      &&result.headings.slot===result.headings.slotSheet&&result.headings.screen!==result.headings.slot,JSON.stringify(result.headings));
    check('同じランで提示する刻印は重複しない',new Set(result.offers).size===4,JSON.stringify(result.offers));
    check('抑圧の指定マスは空きマスから一度だけ抽選して保存',result.targetA===result.targetB&&result.targetA!==0,JSON.stringify([result.targetA,result.targetB]));
    check('五聖の座の承認2回以上だけステージ5へ進む',JSON.stringify(result.counts)===JSON.stringify([false,false,true,true])
      &&result.transitions[0]?.kind==='clear'&&result.transitions[0]?.clear===true
      &&result.transitions[1]?.kind==='stage5'&&result.transitions[1]?.wave===5,JSON.stringify({counts:result.counts,transitions:result.transitions}));
    check('五聖の座の台詞行とMC001表情を保持',result.dialogue.initial.length===3&&result.dialogue.entry.length===5
      &&result.dialogue.entry.slice(2).every(line=>/^MC001_[A-Z]+$/.test(line.face)),JSON.stringify(result.dialogue));

    await browser.eval(`
      G._wave=3;G._isWaveAltar=true;G._fiveSaints={visited:true,offeredNos:[],offers:{},
        decisions:{'1':{accepted:true},'2':{accepted:false}},targets:{}};
      _fiveSaintsShowScene();return true;
    `);
    await browser.waitFor(`!!document.getElementById('five-saints-decor')
      &&!!document.querySelector('.tavern-portrait[data-portrait-id="MC001"]')
      &&!!document.querySelector('.tavern-portrait[data-portrait-id="MC009"]')`,10000);
    const scene=await browser.eval(`
      const host=document.getElementById('five-saints-decor');
      const symbols=[...host.querySelectorAll('.five-saints-symbol')];
      const portrait=id=>{const el=document.querySelector('.tavern-portrait[data-portrait-id="'+id+'"]');return el&&{
        left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height};};
      return {background:getVillageBackgroundKey(),title:document.getElementById('village-name-main')?.textContent||'',
        approval:[getComputedStyle(host.querySelector('.five-saints-approval')).left,getComputedStyle(host.querySelector('.five-saints-approval')).top],
        primary:[getComputedStyle(host.querySelector('.five-saints-primary')).left,getComputedStyle(host.querySelector('.five-saints-primary')).top,
          getComputedStyle(host.querySelector('.five-saints-primary')).width,getComputedStyle(host.querySelector('.five-saints-primary')).height],
        divider:[getComputedStyle(host.querySelector('.five-saints-divider')).left,getComputedStyle(host.querySelector('.five-saints-divider')).top,
          getComputedStyle(host.querySelector('.five-saints-divider')).width,getComputedStyle(host.querySelector('.five-saints-divider')).height],
        symbolLeft:symbols.map(el=>el.style.left),symbolTop:symbols.map(el=>getComputedStyle(el).top),
        symbolSrc:symbols.map(el=>el.querySelector('img')?.getAttribute('src')||''),
        animation:symbols.map(el=>getComputedStyle(el).animationName),
        animationDuration:symbols.map(el=>getComputedStyle(el).animationDuration),
        mc001:portrait('MC001'),mc009:portrait('MC009')};
    `);
    check('五聖の座の背景・左上見出し・A/B立ち絵',scene.background==='towerLanding'
      &&scene.title===result.headings.screen&&!!scene.mc001&&JSON.stringify(scene.mc009)===JSON.stringify({left:'2060px',top:'185px',width:'2455px',height:'4118px'}),JSON.stringify(scene));
    check('五聖の座の承認飾りを指定座標・寸法で描く',JSON.stringify(scene.approval)===JSON.stringify(['1650px','115px'])
      &&JSON.stringify(scene.primary)===JSON.stringify(['1735px','145px','90px','90px'])
      &&scene.divider[0]==='1850px'&&scene.divider[1]==='160px'
      &&Math.abs(parseFloat(scene.divider[2])-2.667)<0.02&&scene.divider[3]==='60px'
      &&JSON.stringify(scene.symbolLeft)===JSON.stringify(['1875px','1965px','2055px','2145px'])
      &&scene.symbolTop.every(top=>top==='155px'),JSON.stringify(scene));
    check('受諾済み／拒否済み／現在の塔のシンボル表示',/symbol1\.svg$/.test(scene.symbolSrc[0])
      &&/symbol2\.svg$/.test(scene.symbolSrc[1])&&scene.animation[0]==='none'&&scene.animation[1]==='none'
      &&scene.animation[2]==='five-saints-current-pulse'&&scene.animationDuration[2]==='4s',JSON.stringify(scene));

    const formation=await browser.eval(`
      const old={sfx:playSfx,accept:_fiveSaintsAccept,reject:_fiveSaintsReject};
      const sounds=[],rows=[];let actions=0;
      const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);
        let opacity=1;for(let p=el;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);
        return opacity>.9&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth;};
      try{
        playSfx=(key,opt)=>{sounds.push({key,guard:opt&&opt.guardKey});return true;};
        _fiveSaintsAccept=async()=>actions++;_fiveSaintsReject=async()=>actions++;
        G._onlineMode=false;G._wave=3;G.questProgress={};G.mapPanelPowers={};G.allies=G.allies||[];G.enemies=G.enemies||[];  // 編成画面（goToReward）は G.allies・G.enemies を読む（この検査はランを始めずに開く）
        const hero=makePanel(PANEL_POOL.find(c=>c.category==='キャラクター'&&c.name==='ブラウニー').id);
        for(const accepted of [false,true])for(const invalid of ['empty','misplaced','sealed']){
          G._fiveSaints={visited:true,offeredNos:['E077'],offers:{'3':'E077'},decisions:{},targets:{}};
          G._fiveSaintsResolving=false;G.mainBoard=new Array(15).fill(null);G.globalPanels=[];
          _fiveSaintsShowScene();
          const firstPair=['MC001','MC009'].every(id=>visible(document.querySelector('.tavern-portrait[data-portrait-id="'+id+'"]')));
          _fiveSaintsOpenFormationNow();
          if(accepted){G.mainBoard[0]=_rewCards[0];_rewCards=[];}
          if(invalid!=='empty'){const c=clone(hero);if(invalid==='sealed')c.keywords=[...(c.keywords||[]),'封印999'];G.mainBoard[invalid==='sealed'?1:2]=c;}
          syncFiveSaintsFormationControls();
          const button=document.querySelector('#reward-move-btns .rew-move-btn');
          const before=JSON.stringify({board:G.mainBoard,state:G._fiveSaints,ctx:_qFormationContext});
          sounds.length=0;const count=actions;button.click();
          const message=document.getElementById('fatal-error-message');
          rows.push({accepted,invalid,firstPair,label:button.textContent.trim(),
            blocked:actions===count&&G._isFiveSaints&&document.body.classList.contains('five-saints-formation-active')
              &&before===JSON.stringify({board:G.mainBoard,state:G._fiveSaints,ctx:_qFormationContext}),
            warning:document.body.classList.contains('fatal-error-active')&&visible(message)
              &&message.textContent===textMessage('戦闘キャラ不在時','')
              &&document.getElementById('fatal-error-title').textContent===textMessage('「戦闘キャラ不在時」見出し',''),
            instant:sounds.filter(s=>s.key==='uiConfirm').length===1});
          document.getElementById('fatal-error-back-btn').click();
          G.mainBoard[3]=clone(hero);syncFiveSaintsFormationControls();sounds.length=0;button.click();
          rows[rows.length-1].allowed=actions===count+1&&sounds.filter(s=>s.key==='uiConfirm').length===1;
          sounds.length=0;document.querySelector('#reward-move-btns .rew-reset-btn').click();
          rows[rows.length-1].resetSound=sounds.filter(s=>s.key==='uiConfirm').length===1;
        }
        return rows;
      }finally{
        playSfx=old.sfx;_fiveSaintsAccept=old.accept;_fiveSaintsReject=old.reject;questForceEndEventForDebug();
      }
    `);
    check('五聖の座は入場時からA/B両方が見える',formation.every(row=>row.firstPair),JSON.stringify(formation));
    check('受諾・拒否ともキャラ不在／召喚マス外／全員封印で同じ警告、編成と決定を保つ',
      formation.length===6&&formation.every(row=>row.blocked&&row.warning),JSON.stringify(formation));
    check('受諾・拒否・元に戻すは押した瞬間にui_confirmが1回、出撃可能なら退出処理も1回',
      formation.every(row=>row.instant&&row.allowed&&row.resetSound),JSON.stringify(formation));

    const smoke=await browser.eval(`
      return (async()=>{
        showScreen('village');await _qClearPresentation({immediate:true,includeShop:true});
        await showTavernPortrait('MC009',{screen:'village',key:'five-saints-mc009'});
        const portrait=document.querySelector('.tavern-portrait[data-portrait-key="five-saints-mc009"]');
        const before=portrait.getBoundingClientRect();const pending=_qSmokePortraitUp('five-saints-mc009');
        const group=document.querySelector('.five-saints-smoke-group'),animation=group.getAnimations()[0];
        animation.pause();const samples=[];
        for(const progress of [0,.2,.5,.8,1]){
          animation.currentTime=FIVE_SAINTS_SMOKE_MS*progress;
          const r=portrait.getBoundingClientRect(),s=getComputedStyle(group);
          samples.push({progress,dx:r.left-before.left,dy:r.top-before.top,transform:s.transform,opacity:s.opacity,mask:s.maskPosition});
        }
        animation.finish();await pending;
        return {samples,gone:!document.querySelector('.five-saints-smoke-group'),duration:FIVE_SAINTS_SMOKE_MS};
      })();
    `);
    check('煙化は1600msの間、立ち絵の座標・transform・opacityを動かさず下からのマスクだけが進む',
      smoke.duration===1600&&smoke.gone&&smoke.samples.every(s=>Math.abs(s.dx)<.1&&Math.abs(s.dy)<.1&&s.transform==='none'&&s.opacity==='1')
      &&smoke.samples[0].mask!==smoke.samples[4].mask&&smoke.samples[4].mask.includes('112%'),JSON.stringify(smoke));

    const addedAssets=await browser.eval(`
      const urls=['assets/art/backgrounds/tower_landing.webp','assets/art/sprites/MC009.webp',
        'assets/ui/approval.svg','assets/ui/symbol1.svg','assets/ui/symbol2.svg',
        'assets/art/enchantments/E076.jpg','assets/art/enchantments/E077.jpg',
        'assets/art/enchantments/E078.jpg','assets/art/enchantments/E079.jpg','assets/art/enchantments/E080.jpg'];
      const load=url=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({url,ok:true,w:img.naturalWidth,h:img.naturalHeight});
        img.onerror=()=>resolve({url,ok:false,w:0,h:0});img.src=url;});
      return await Promise.all(urls.map(load));
    `);
    check('五聖の座の追加素材が読み込める',addedAssets.every(entry=>entry.ok),JSON.stringify(addedAssets));

    const failed=(browser.events||[]).filter(event=>event.method==='Network.responseReceived'&&event.params.response.status>=400)
      .map(event=>event.params.response.url).filter(url=>!/favicon\.ico$/.test(url)&&!/Vesselbound_data[^/]*\.xlsx$/.test(url));
    check('追加素材の読み込み失敗が無い',failed.length===0,JSON.stringify(failed));
    const errors=browser.consoleErrors().filter(error=>!/Failed to load resource/.test(String(error)));
    check('コンソールに例外が無い',errors.length===0,JSON.stringify(errors.slice(0,5)));
  }catch(error){
    check('検査実行',false,error&&error.stack||String(error));
  }finally{
    await browser.close();
  }

  let ng=0;
  checks.forEach(item=>{if(!item.ok) ng++;console.log(`${item.ok?'OK':'NG'} ${item.name}${item.detail?' '+item.detail:''}`);});
  console.log(`刻印・五聖の座検証: NG ${ng}`);
  if(ng) process.exitCode=1;
})();
