'use strict';

const character = c => c?.category==='キャラクター';
const enchant = c => ['エンチャント','強化'].includes(c?.category);
const n = x => Number(x)||0;
const mana = c => /マナ/.test(c?.desc||'') || n(c?.manaCost)>0;
function base(c) {
  if (!c) return 0;
  return n(c.power??c.atk)+n(c.life??c.hp)+n(c.rarity)*2
    +(c.desc?3:0)+(c.keywords?.length||c.adjacentKeywords?.length||0)*2
    +(enchant(c)?n(c.adjacentAtkBonus)+n(c.adjacentHpBonus)+5:0);
}

// 評価関数だけを追加すれば --policy all にも反映される。
const policies = {
  greedy:{description:'ATK+HP+レア度×2+効果文3+キーワード数×2。強化は隣接ATK/HP+5を加点。', score:base},
  color:{description:'基本評価+最初のキャラと同色18、異色キャラ-8。前衛は同色の高HPを優先。',
    score:(c,ctx)=>base(c)+(character(c)?(c.color===ctx.color?18:-8):0)},
  enchant:{description:'基本評価+エンチャント16。主力本体と、主力へ接続する強化網を優先。',
    score:c=>base(c)+(enchant(c)?16:0)},
  mana:{description:'基本評価+マナ効果/獲得18。マナ効果の本体を後衛に置き、接続を優先。',
    score:c=>base(c)+(mana(c)?18:0)},
  lookahead:{description:'次戦の敵を独立seed3回生成し、本番computeBattleの勝率→残HP合計→与ダメージで選択。基本評価は候補の絞込みだけに使う。',score:base},
  planner:{description:'次戦と次のエリート/ボスを実コアで比較し、入手見込み・接続・9種の型を学習係数で評価する。r1指定時は旧来の役割評価のみ。トリプル投資は行わない。',
    score:(c,ctx)=>base(c)+require('./planner').cardValue(c,ctx)},
};

function score(name,c,ctx) { return policies[name].score(c,ctx); }
// 純粋なAI評価。本体の接続探索を呼び、方向を改造せず実際のつながりで採点する。
function layoutScore(name,ctx) {
  const unit=_getPartyBoardUnit(), board=unit.boardCards;
  const deploy=formationDeploySlots(unit);
  let value=0, unsealed=0;
  for (const {idx,toRear} of deploy) {
    const card=board[idx];
    if (!character(card)) continue;
    const rank=score(name,card,ctx);
    const connected=_collectEnhancementPanelsForSlot(unit,idx);
    const sealed=_isSealPanel(card)||connected.some(entry=>_isSealPanel(entry.panel));
    if(!sealed) unsealed++;
    value+=rank*(sealed?0.35:1.2);
    value+=toRear?(name==='mana'&&mana(card)?8:0):n(card.life)*0.35+n(card.power)*0.1;
    for (const entry of connected) {
      value+=score(name,entry.card||entry.panel,ctx)*(0.5+Math.min(2,rank/50))*(name==='enchant'?1.8:1);
    }
  }
  // 予備キャラ・合体素材にも小さな価値。出撃枠を強化で潰すのは避ける。
  for (let i=0;i<board.length;i++) if (board[i]) value+=score(name,board[i],ctx)*0.08;
  return value-(unsealed?0:100000)+(name==='planner'?require('./planner').layoutValue(ctx):0);
}

function canPlace(card,idx) {
  const unit=_getPartyBoardUnit();
  if (!_canCardUseBoardSlot(card,idx,unit)) return false;
  const arr=unit.boardCards.slice();arr[idx]=card;
  return _canApplyBoardChange(unit,arr);
}

function placement(name,card,ctx,{shop=false}={}) {
  const unit=_getPartyBoardUnit(), board=unit.boardCards;
  const baseline=layoutScore(name,ctx);
  let best=null;
  for (let idx=0;idx<board.length;idx++) {
    if (shop && board[idx] && !_mergedPanelCard(board[idx],card)) continue;
    if (!canPlace(card,idx)) continue;
    const old=board[idx]; board[idx]=card;
    let value=layoutScore(name,ctx)-baseline;
    board[idx]=old;
    // 合体は本体が行う。AIは同名の2枚を持っている場合に収集価値を加点。
    if (panelMergeEnabled()&&name!=='planner'&&!card._tripleMerged && board.filter(c=>c && c.name===card.name && !c._tripleMerged).length>=2) value+=24;
    if (character(card) && !board.some(character)) value+=100;
    if (!best || value>best.gain) best={slot:idx,gain:value};
  }
  return best;
}

function exchangeChoices(name,ctx) {
  const board=_getPartyBoardUnit().boardCards,baseline=layoutScore(name,ctx),choices=[];
  for(let index=0;index<_rewCards.length;index++)for(let slot=0;slot<board.length;slot++) {
    if(!canExchangeShopCardAt(index,slot))continue;
    const old=board[slot];board[slot]=_rewCards[index];
    const gain=layoutScore(name,ctx)-baseline;board[slot]=old;
    choices.push({index,slot,gain});
  }
  return choices.sort((a,b)=>b.gain-a.gain||a.index-b.index||a.slot-b.slot);
}

// 必須の還魂。低評価のカードを優先し、出撃不能になる3枚組は除く。
// 失う接続網も盤面の評価で比較し、先読みはこの候補群ごとに次戦を試す。
function sacrificePlans(name,ctx) {
  if(G._ringOfferUnlocked)return [{sacrifice:[],value:layoutScore(name,ctx)}];
  const need=SHOP_EXCHANGE_TRIAL.ringCardCost-(Number(G._boardDiscardCount)||0);
  const board=_getPartyBoardUnit().boardCards;
  const slots=board.map((card,slot)=>ringExchangeSacrificeAllowed(card)?slot:-1).filter(i=>i>=0);
  const plans=[];
  function walk(from,picked) {
    if(picked.length===need) {
      if(!canSacrificeRingCards(picked))return;
      const cards=picked.map(i=>board[i]);picked.forEach(i=>{board[i]=null;});
      const value=layoutScore(name,ctx);picked.forEach((slot,i)=>{board[slot]=cards[i];});
      plans.push({sacrifice:picked.slice(),value});return;
    }
    for(let i=from;i<slots.length;i++)walk(i+1,picked.concat(slots[i]));
  }
  if(need>0)walk(0,[]);
  return plans.sort((a,b)=>b.value-a.value||a.sacrifice.join(',').localeCompare(b.sacrifice.join(',')));
}

// 配置替えは合法なスワップだけ。与えられた矢印の向きでつながる場所を探す。
function arrange(name,ctx,{retry=false,passes=3}={}) {
  const unit=_getPartyBoardUnit(), board=unit.boardCards;
  for (let pass=0;pass<passes;pass++) {
    let best=null, value=layoutScore(name,ctx);
    for (let a=0;a<board.length;a++) for (let b=a+1;b<board.length;b++) {
      if (!board[a]&&!board[b]) continue;
      if ((board[a]&&!_canCardUseBoardSlot(board[a],b,unit)) || (board[b]&&!_canCardUseBoardSlot(board[b],a,unit))) continue;
      [board[a],board[b]]=[board[b],board[a]];
      const next=_canApplyBoardChange(unit,board)?layoutScore(name,ctx):-Infinity;
      [board[a],board[b]]=[board[b],board[a]];
      if (next>value+0.01) {value=next;best=[a,b];}
    }
    if (!best) break;
    const [a,b]=best;[board[a],board[b]]=[board[b],board[a]];
    _syncUnitPanelEffectsAfterMove(unit);
  }
  // 同じ局所解での再戦を避ける。戦力点を大きく落とさない別の左右・前後衛配置を試す。
  if(retry) {
    const baseValue=layoutScore(name,ctx),candidates=[];
    for(let a=0;a<board.length;a++)for(let b=a+1;b<board.length;b++) {
      if(!board[a]&&!board[b])continue;
      if(board[a]&&!_canCardUseBoardSlot(board[a],b,unit)||board[b]&&!_canCardUseBoardSlot(board[b],a,unit))continue;
      [board[a],board[b]]=[board[b],board[a]];
      const value=layoutScore(name,ctx);
      const allowed=_canApplyBoardChange(unit,board)&&boardHasDeployableCharacter(unit);
      [board[a],board[b]]=[board[b],board[a]];
      if(allowed&&value>=baseValue*0.85)candidates.push({a,b,value});
    }
    candidates.sort((a,b)=>b.value-a.value||a.a-b.a||a.b-b.b);
    if(candidates.length){const chosen=candidates[(Number(G._waveDefeatCount)||0)%Math.min(6,candidates.length)];[board[chosen.a],board[chosen.b]]=[board[chosen.b],board[chosen.a]];_syncUnitPanelEffectsAfterMove(unit);}
  }
}

module.exports={policies,score,base,mana,character,enchant,placement,arrange,layoutScore,exchangeChoices,sacrificePlans};
