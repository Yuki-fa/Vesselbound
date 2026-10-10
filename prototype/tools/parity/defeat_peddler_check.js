'use strict';
// 初めての敗北の行商人イベント（2026-10-10 利用者指定）を、本物の画面で確かめる。
//   camp の背景・MC025 の立ち絵（X2505・Y685）・Bの吹き出しの尻尾（Yだけ685）・会話シートの台詞
//   → 魔導店と同じ売買の編成画面（キャラ2・エンチャント2・アイテム1、アイテムは下側）・「再戦」
//   → プロフィールに記録され、2回目の敗北では出ない。保存から再開しても行商人の画面に戻る。
// 実行：node tools/parity/defeat_peddler_check.js（既定 http://127.0.0.1:5500、VB_URL で変更）
const assert = require('node:assert/strict');
const { launch } = require('./headless');
const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
let checked = 0;
const ok = (name, value, detail) => { assert.ok(value, name + (detail ? ' ' + JSON.stringify(detail) : '')); checked++; console.log('OK ' + name); };
(async () => {
  const b = await launch();
  try {
    await b.goto(URL); await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20&&typeof defeatPeddlerPending==="function"', 20000);
    await b.eval('window.alert=()=>{};_prepareStoryArrival=()=>null;');
    // プロフィールの記録を消してから通常ランを始める。
    await b.eval('const p=SaveProfile.load();if(p.tutorialsShown) delete p.tutorialsShown.defeatPeddler;SaveStorage.write("profile",p,SaveProfile.validate);SaveProfile.resetCache();');
    await b.eval('startGame(false);window.__rid=G._runId;');
    await b.waitFor('loadRun()?.runId===window.__rid&&loadRun()?.checkpoint?.type==="town"&&!G._villageIntroPlaying&&!!document.querySelector("#scr-village.active")', 20000);
    ok('イベントの条件（初めて・会話あり）', await b.eval('return defeatPeddlerPending()'));
    // 戦闘の開幕だけ止め、敗北の決着を本物の経路で通す。
    const lose = async () => {
      await b.eval('window.__intro=0;_playBattleStartIntro=async()=>{window.__intro++;return new Promise(()=>{})};G._villageIntroPlaying=false;_startWaveFlowNext();');
      await b.waitFor('window.__intro>0', 20000);
      // 開幕を止めると戦闘前の入力止め（body.inert）が残るので外す。実戦では戦闘が進んで外れる。
      await b.eval('SaveRun.lockInput(false);document.getElementById("scr-battle").classList.remove("battle-opening-pending","battle-opening-active");G._battleDefeatHandled=false;void _finishWaveBattleDefeat(null);');
      await b.waitFor('typeof G._battleProceedAction==="function"', 20000);
      await b.eval('continueAfterBattleVictory();');
    };
    await lose();
    await b.waitFor('!!document.querySelector(".tavern-portrait[data-portrait-id=\\"MC025\\"].is-visible")', 20000);
    const scene = await b.eval(`const img=document.querySelector('.tavern-portrait[data-portrait-id="MC025"]');
      const bg=getComputedStyle(document.getElementById('scr-village')).backgroundImage+' '+(document.querySelector('#scr-village .village-bg,#village-bg')?.style?.backgroundImage||'');
      return {left:img.style.left,top:img.style.top,camp:G._questCampScene,bgKey:getVillageBackgroundKey(),bg,
        recorded:SaveProfile.tutorialShown('defeatPeddler')};`);
    ok('背景は camp', scene.camp && scene.bgKey === 'camp', scene);
    ok('Bは MC025、X2505・Y685', scene.left === '2505px' && scene.top === '685px', scene);
    ok('始めた時点でプロフィールに記録', scene.recorded);
    await b.waitFor('!!document.querySelector(".tavern-dialogue-bubble .tavern-dialogue-text")||!!document.querySelector("#tavern-dialogue-layer .tavern-dialogue-text")', 10000);
    const bubble = await b.eval(`const sheet=_storyTalkLines(storyTalkEntry('戦闘敗北時（一度だけ）'));
      const texts=[...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-text')].map(e=>e.textContent);
      const bubbleEl=[...document.querySelectorAll('#tavern-dialogue-layer *')].find(e=>e._dialogueTail);
      const tail=bubbleEl&&bubbleEl._dialogueTail;
      const cs=bubbleEl&&getComputedStyle(bubbleEl);
      return {texts,first:sheet[0]&&sheet[0].text,tailTop:tail&&parseFloat(tail.style.top),tailLeft:tail&&parseFloat(tail.style.left),tailTransform:tail&&tail.style.transform,bubbleBottom:bubbleEl&&(parseFloat(bubbleEl.style.top)+parseFloat(bubbleEl.style.height)),
        opacity:cs&&cs.opacity,visibility:cs&&cs.visibility,TAIL_H:TAVERN_LINE_TAIL_H,rightX:TAVERN_DIALOGUE_ANCHORS.right.x,TAIL_W:TAVERN_LINE_TAIL_W};`);
    const SHOT = process.env.VB_SHOT_DIR;
    if (SHOT) { await new Promise(r => setTimeout(r, 1200)); await b.screenshot(require('path').join(SHOT, 'peddler_event.png')); }
    ok('会話シートの1行目を表示', bubble.texts.some(t => t === bubble.first), bubble);
    ok('Bの吹き出しは上下反転（尻尾が下向き）で先端が Y1140・Xは通常のまま', bubble.tailTop === 1140 - bubble.TAIL_H && bubble.tailLeft === bubble.rightX - bubble.TAIL_W && String(bubble.tailTransform).replace(/\s/g, '') === 'scale(-1,1)' && bubble.bubbleBottom <= 1140, bubble);
    ok('吹き出しが見えている', bubble.visibility !== 'hidden' && Number(bubble.opacity) > 0.5, bubble);
    for (let i = 0; i < 12; i++) {
      if (await b.eval('return document.body.classList.contains("shop-screen-active")')) break;
      await b.eval('document.getElementById("tavern-dialogue-layer")?.click();');
      await new Promise(r => setTimeout(r, 900));
    }
    await b.waitFor('document.body.classList.contains("shop-screen-active")&&G._isPeddler', 15000);
    const shop = await b.eval(`const kinds=_rewCards.map(c=>!c?null:_isItemCard(c)?'item':String(c.category||''));
      const cards=[...document.querySelectorAll('#reward-offer-row > .rew-card')];
      const item=cards.find(e=>e.classList.contains('item-shop-card'));
      const title=document.querySelector('#reward-production-ui .reward-prod-title span')?.textContent;
      const btn=document.querySelector('#reward-move-btns .rew-move-btn')?.textContent;
      const peddlerItems=ITEM_POOL.filter(i=>i._peddlerAvailable).map(i=>i.name);
      const itemName=_rewCards[4]&&_rewCards[4].name;
      const rowBottom=document.getElementById('reward-offer-row').getBoundingClientRect().bottom;
      return {kinds,count:cards.length,itemDown:!!item&&item.classList.contains('item-shop-card-down'),
        itemBottom:item&&item.getBoundingClientRect().bottom,rowBottom,title,btn,peddlerItems,itemName,
        prices:_rewCards.map(c=>c&&c._buyPrice),checkpoint:loadRun()?.checkpoint?.type,saved:loadRun()?.state?.place?._isPeddler};`);
    if (SHOT) { await new Promise(r => setTimeout(r, 1500)); await b.screenshot(require('path').join(SHOT, 'peddler_shop.png')); }
    ok('左からキャラクター2・エンチャント2・アイテム1', JSON.stringify(shop.kinds) === JSON.stringify(['キャラクター', 'キャラクター', 'エンチャント', 'エンチャント', 'item']), shop);
    ok('アイテムは行商人列が true のもの', shop.peddlerItems.includes(shop.itemName), shop);
    ok('アイテムは下側に揃える', shop.itemDown && Math.abs(shop.itemBottom - shop.rowBottom) < 4, shop);
    ok('全商品に値段', shop.prices.every(p => p > 0), shop);
    ok('見出しは行商人', shop.title === '行商人', shop);
    ok('ボタンは「再戦」', /再戦/.test(shop.btn || ''), shop);
    ok('敗北後の reward チェックポイントに行商人の旗と品揃えを保存', shop.checkpoint === 'reward' && shop.saved === true, shop);
    // アイテムを買う（クリック購入）。
    const buy = await b.eval(`G.gold=10000;refreshRewardGoldUi();const before=G.gold,price=_rewCards[4]._buyPrice;takeRewCard(4);
      return {paid:before-G.gold,price,soldOut:_rewCards[4]===null,held:_ensureItemSlots().some(Boolean)};`);
    ok('アイテムを代金を払って買える', buy.paid === buy.price && buy.soldOut && buy.held, buy);
    // 保存から再開しても行商人の画面へ戻る。
    await b.eval('SaveRun.checkpoint("reward");');
    await b.goto(URL); await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20', 20000);
    await b.eval('window.alert=()=>{};void SaveRun.continueRun();');
    await b.waitFor('document.body.classList.contains("shop-screen-active")&&G._isPeddler', 20000);
    const resumed = await b.eval('return {kinds:_rewCards.map(c=>!c?null:_isItemCard(c)?"item":String(c.category||"")),btn:document.querySelector("#reward-move-btns .rew-move-btn")?.textContent}');
    ok('再開しても行商人の品揃え（買ったアイテムは売切）と「再戦」', resumed.kinds[4] === null && resumed.kinds.slice(0, 4).every(Boolean) && /再戦/.test(resumed.btn || ''), resumed);
    // 「再戦」で同じ戦闘へ。行商人の旗は残らない。
    await b.eval('window.__intro=0;_playBattleStartIntro=async()=>{window.__intro++;return new Promise(()=>{})};document.querySelector("#reward-move-btns .rew-move-btn").click();');
    await b.waitFor('window.__intro>0', 20000);
    await b.eval('SaveRun.lockInput(false);');
    ok('再戦へ進み、行商人の旗を外す', await b.eval('return !G._isPeddler&&!G._isShop&&G._waveIsRetry!==false'));
    // 2回目の敗北では出ない。
    ok('2回目は条件を満たさない', await b.eval('return !defeatPeddlerPending()'));
    await b.eval('G._battleDefeatHandled=false;void _finishWaveBattleDefeat(null);');
    await b.waitFor('typeof G._battleProceedAction==="function"', 20000);
    await b.eval('continueAfterBattleVictory();');
    await b.waitFor('document.body.classList.contains("reward-screen-active")&&!document.body.classList.contains("quest-camp-scene")', 20000);
    ok('2回目の敗北は通常の編成画面', await b.eval('return !G._isPeddler&&!G._isShop&&!document.querySelector(".tavern-portrait[data-portrait-id=\\"MC025\\"]")'));
    const errs = b.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
    ok('ブラウザ例外なし', errs.length === 0, errs.slice(0, 3));
    console.log(`行商人イベント検査: ${checked}件OK`);
  } finally { await b.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
