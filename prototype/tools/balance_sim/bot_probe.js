'use strict';

// 新しい構文を認めるパーサーではない。同じ編成で効果文を外した時とのコア差分を観測する。
// 反応が無くても、試していない条件の効果まで未実装と断定しない。
function probeCard(card) {
  if(!card.desc) return {interpreted:null,message:'効果文なし（キーワード・数値のみ）'};
  const saved=G, oldRandom=Math.random;
  function simulate(withText,mana,enemyAttack,seed) {
    initState();G._wave=2;G.floor=_waveStageFloor(2,1);
    const neutral={id:'bot_probe_body',type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',
      name:'検査用本体',color:'赤',power:6,life:30,desc:'',keywords:[],directions:['up','right','down','left']};
    const target=JSON.parse(JSON.stringify(card));
    target.directions=['up','right','down','left'];
    if(!withText) {
      target.desc='';target.keywords=[];target.adjacentKeywords=[];
      for(const key of Object.keys(target)) if(/^(mana|adjacent|goldOn|randomItem|release|summonCount)/.test(key)) delete target[key];
      if(target.category==='エンチャント') target.name='検査用の効果なし強化';
    }
    G.mainBoard[1]=target.category==='キャラクター'?target:neutral;
    if(target.category!=='キャラクター') G.mainBoard[6]=target;
    const board=_getPartyBoardUnit();
    const formation=buildBoardFormation(board,{persistEternal:false});
    const units=formation.ordered.filter(e=>e.assignedSlot>=0).map(e=>e.unit);
    const foe=(id,color)=>({id,name:'検査用敵',atk:enemyAttack,hp:45,maxHp:45,baseAtk:enemyAttack,baseMaxHp:45,
      color,keywords:[],desc:'',lane:'front',side:'p2'});
    const state=coreInitializeBattleState({units:{p1:units,p2:[foe('probe-e1','青'),foe('probe-e2','緑')]},
      resources:{p1:{mana,gold:100},p2:{mana:0,gold:0}},life:{p1:2,p2:3},maxLife:{p1:3,p2:3},
      blood:{p1:20,p2:0},rings:{p1:[],p2:[]},items:{p1:[],p2:[]},
      summonDefs:[...PANEL_POOL,...ENEMY_POOL],itemDefs:ITEM_POOL,stageNumber:2,mapIndex:G.floor});
    const events=[];
    const result=runBattleCore(state,createSeededRng(seed),{onEvent:e=>{
      // battle_start の本文そのものは解釈した証拠に数えない。効果点灯だけも除く。
      if(!['battle_start','effect_flash','turn_begin','mana_threshold'].includes(e.type)) events.push(e);
    }});
    const clean=value=>JSON.stringify(value,(key,v)=>{
      if(['id','unitId','sourceId','targetId','unit','desc','name','effectNo','lastVisualRect'].includes(key)) return undefined;
      if(typeof v==='number'&&!Number.isFinite(v)) return null;
      return v;
    });
    return clean({result,events,resources:state.resources,life:state.life,
      survivors:['p1','p2'].map(side=>state.units[side].filter(Boolean).map(u=>({atk:u.atk,hp:u.hp,shield:u.shield,poison:u.poison,keywords:u.keywords})))});
  }
  try {
    // uid生成にも同じ列を与える。プローブは本番ランの乱数・状態を消費しない。
    for(const mana of [0,50]) for(const attack of [2,50]) {
      let t=0;Math.random=()=>((++t*1103515245>>>0)/4294967296);
      const active=simulate(true,mana,attack,17);
      t=0;
      const blank=simulate(false,mana,attack,17);
      if(active!==blank) return {interpreted:true,message:'コア解釈を確認（少なくとも一部：効果文あり／なしの戦闘結果・効果イベントが相違）'};
    }
    return {interpreted:false,message:'コアが解釈しない、またはプローブの発動条件外（4条件で数値・効果イベントに差なし）'};
  } finally {G=saved;Math.random=oldRandom;}
}

module.exports={probeCard};
