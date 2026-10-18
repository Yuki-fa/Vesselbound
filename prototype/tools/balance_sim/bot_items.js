'use strict';
const {score}=require('./policies');

// 実プレイと先読みで同じ使用方針を通す。効果・消費・対象可否は全て本体。
async function useItems(policy,context,record=()=>{}) {
  for(let index=0;index<_ensureItemSlots().length;index++) {
    const card=_ensureItemSlots()[index];if(!card||!_canUseItemNow(card))continue;
    const key=_itemEffectKey(card);
    if(['portal_scroll','weakening_scroll','sacrifice_doll'].includes(key))continue;
    if(!_useImmediateItem(index,card))continue;
    for(let step=0;G._pendingItemUse&&step<2;step++) {
      const targets=G.mainBoard.map((c,slot)=>({c,slot})).filter(x=>x.c&&_isItemUseTargetSlot(x.slot))
        .sort((a,b)=>score(policy,b.c,context)-score(policy,a.c,context));
      if(!targets.length){_cancelPendingItemUse(true);break;}
      handlePendingItemBoardTarget(targets[0].slot);
    }
    if(G._pendingItemUse)_cancelPendingItemUse(true);
    if(!_ensureItemSlots()[index])record(card);
  }
  await Promise.resolve();
}
module.exports={useItems};
