'use strict';
// ドラッグ中の暗転は、対象枠をオーバーレイより上へ出す積層順で実現している。
// 後段CSSで battle-scroll の z-index を戻すと、左側パネル一式が暗くならないため、
// 指輪・アイテム・カードの3経路を実ブラウザの計算済みスタイルで固定する。
const { launch } = require('./headless');

const BASE = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail });

(async () => {
  const b = await launch();
  try {
    await b.goto(BASE, 2500);
    await b.waitFor("typeof _setDragZoneClass==='function'");

    const states = await b.eval(`
      document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
      document.getElementById('scr-battle').classList.add('active');
      document.body.className='reward-screen-active';
      const ids=['reward-production-ui','battle-order-section','main-hand-area','hand-pane-board-bg','hand-pane'];
      ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.style.removeProperty('z-index'); });
      const read=()=>{
        const css=id=>getComputedStyle(document.getElementById(id));
        return {
          ringOverlay:{display:css('ring-drag-overlay').display,background:css('ring-drag-overlay').backgroundColor,z:css('ring-drag-overlay').zIndex},
          cardOverlay:{display:css('mainequip-drag-overlay').display,background:css('mainequip-drag-overlay').backgroundColor,z:css('mainequip-drag-overlay').zIndex},
          scrollZ:css('scr-battle').getPropertyValue('--unused')||getComputedStyle(document.querySelector('.battle-scroll')).zIndex,
          productionZ:css('reward-production-ui').zIndex,
          orderZ:css('battle-order-section').zIndex,
          mainZ:css('main-hand-area').zIndex,
          board:{display:css('hand-pane-board-bg').display,opacity:css('hand-pane-board-bg').opacity,filter:css('hand-pane-board-bg').filter,z:css('hand-pane-board-bg').zIndex},
          paneZ:css('hand-pane').zIndex,
          debugFilter:css('debug-card-palette').filter,
          visibilityFilter:css('board-card-visibility-btn').filter,
          itemPanelFilter:getComputedStyle(document.querySelector('.reward-prod-item')).filter,
          ringPanelFilter:getComputedStyle(document.querySelector('.reward-prod-ring')).filter,
        };
      };
      const out={};
      for(const cls of ['dragzone-ring-slot','dragzone-itemslot','dragzone-reward-item','dragzone-mainequip','dragzone-reward-spell']){
        _setDragZoneClass(cls);
        out[cls]=read();
      }
      _clearDragZoneClass();
      return out;
    `);

    const ring = states['dragzone-ring-slot'];
    const item = states['dragzone-itemslot'];
    const rewardItem = states['dragzone-reward-item'];
    const card = states['dragzone-mainequip'];
    const rewardCard = states['dragzone-reward-spell'];
    check('指輪ドラッグは黒50%オーバーレイ', ring.ringOverlay.display === 'block' && ring.ringOverlay.background === 'rgba(0, 0, 0, 0.5)', JSON.stringify(ring));
    check('アイテムドラッグは指輪と同じ暗さ', item.ringOverlay.display === 'block' && item.ringOverlay.background === ring.ringOverlay.background, JSON.stringify(item));
    check('提示アイテムも指輪と同じ暗さ', rewardItem.ringOverlay.display === 'block' && rewardItem.ringOverlay.background === ring.ringOverlay.background, JSON.stringify(rewardItem));
    check('アイテム枠だけを前面に残す', Number(item.scrollZ) === 30 && Number(item.productionZ) > Number(item.ringOverlay.z) && Number(item.orderZ) < Number(item.ringOverlay.z), `scroll=${item.scrollZ} production=${item.productionZ} order=${item.orderZ} overlay=${item.ringOverlay.z}`);
    check('前面内ではアイテム枠以外を50%にする', item.itemPanelFilter === 'none' && item.ringPanelFilter === 'brightness(0.5)', `item=${item.itemPanelFilter} ring=${item.ringPanelFilter}`);
    check('アイテムドラッグでも魔導板枠を消さない', item.board.display !== 'none' && Number(item.board.opacity) > 0 && item.board.filter === 'none', JSON.stringify(item.board));
    check('カードドラッグは黒50%オーバーレイ', card.cardOverlay.display === 'block' && card.cardOverlay.background === ring.ringOverlay.background, JSON.stringify(card));
    check('報酬カードも同じ黒50%オーバーレイ', rewardCard.cardOverlay.display === 'block' && rewardCard.cardOverlay.background === ring.ringOverlay.background, JSON.stringify(rewardCard));
    check('カードドラッグは左側全体を暗転対象にする', Number(card.scrollZ) === 30 && Number(card.productionZ) < Number(card.cardOverlay.z), `scroll=${card.scrollZ} production=${card.productionZ} overlay=${card.cardOverlay.z}`);
    check('カードドラッグは報酬枠と魔導板だけを前面に残す', Number(card.orderZ) > Number(card.cardOverlay.z) && Number(card.mainZ) > Number(card.cardOverlay.z) && Number(card.board.z) > Number(card.cardOverlay.z) && Number(card.paneZ) > Number(card.cardOverlay.z), `order=${card.orderZ} main=${card.mainZ} board=${card.board.z} pane=${card.paneZ} overlay=${card.cardOverlay.z}`);
    check('魔導板の装飾はカードと見出しを覆わない', Number(card.board.z) < Number(card.paneZ), `board=${card.board.z} pane=${card.paneZ}`);
    check('デバッグ枠とカード非表示ボタンは暗転する', card.debugFilter === 'brightness(0.5)' && card.visibilityFilter === 'brightness(0.5)', `debug=${card.debugFilter} visibility=${card.visibilityFilter}`);

    for(const r of results) console.log(`${r.ok?'OK':'NG'} \t${r.name}\t${r.detail}`);
    const failures=results.filter(r=>!r.ok);
    console.log(`ドラッグ暗転検証: NG ${failures.length}`);
    if(failures.length) process.exitCode=1;
  } finally {
    await b.close();
  }
})().catch(err=>{ console.error(err); process.exitCode=1; });
