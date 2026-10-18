'use strict';
// 初めての敗北の行商人イベント（2026-10-10 利用者指定）を、本物の画面で確かめる。
//   camp の背景・MC025 の立ち絵（X2505・Y685）・Bの吹き出しの尻尾（Yだけ685）・会話シートの台詞
//   → 魔導店と同じ交換だけの編成画面（報酬抽選の3枚・価格とアイテム枠なし）・「再戦」
//   → 交換・取り戻し・空きマス拒否。背景は camp・行商人の立ち絵のまま、BGM なし（環境音だけ）。
//   → プロフィールに記録され、2回目の敗北は会話を飛ばして新在庫。保存から再開しても交換結果を保つ。
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
    ok('イベントの条件（初めて・会話あり）', await b.eval('return defeatPeddlerPending()&&_defeatPeddlerTalkPending()'));
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
    await new Promise(r=>setTimeout(r,800));
    const shop = await b.eval(`const kinds=_rewCards.map(c=>!c?null:_isItemCard(c)?'item':String(c.category||''));
      const cards=[...document.querySelectorAll('#reward-offer-row > .rew-card')];
      const titleEl=document.querySelector('#reward-production-ui .reward-prod-title span');
      const btnEl=document.querySelector('#reward-move-btns .rew-move-btn');
      const visible=el=>!!el&&[el,...(function*(p){while(p){yield p;p=p.parentElement;}})(el.parentElement)].every(n=>{
        const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;
      })&&getComputedStyle(el).color!=='rgba(0, 0, 0, 0)';
      return {kinds,count:cards.length,items:document.querySelectorAll('#reward-offer-row .item-visual,#reward-offer-row .shop-sold-out-item').length,
        priceUi:document.querySelectorAll('#reward-offer-row .shop-buy-price,#reward-offer-row .shop-insufficient-badge,#hand-slots .shop-board-sell-action').length,
        title:titleEl?.textContent,btn:btnEl?.textContent,visible:cards.every(visible)&&visible(titleEl)&&visible(btnEl),
        prices:_rewCards.map(c=>c&&c._buyPrice),checkpoint:loadRun()?.checkpoint?.type,saved:loadRun()?.state?.place?._isPeddler};`);
    if (SHOT) { await new Promise(r => setTimeout(r, 1500)); await b.screenshot(require('path').join(SHOT, 'peddler_shop.png')); }
    ok('カード3枚を表示し、アイテム枠はない', shop.count===3&&shop.kinds.every(k=>['キャラクター','エンチャント','強化'].includes(k))&&shop.items===0, shop);
    ok('価格・不足札・カード売却UIがない', shop.prices.every(p=>p==null)&&shop.priceUi===0, shop);
    ok('カード・見出し・再戦ボタンが見えている', shop.visible, shop);
    ok('見出しはテキストメッセージシートの「「行商人」見出し」', shop.title === await b.eval(`return textMessage('「行商人」見出し','')`) && !!shop.title, shop);
    ok('ボタンは「再戦」', /再戦/.test(shop.btn || ''), shop);
    ok('敗北後の reward チェックポイントに行商人の旗と品揃えを保存', shop.checkpoint === 'reward' && shop.saved === true, shop);
    const saleScene = async () => b.eval(`const body=document.body;
      return {campBg:body.classList.contains('facility-bg-active')&&String(body.style.getPropertyValue('--facility-bg-image')).includes('camp'),
        portrait:!!document.querySelector('#scr-battle .tavern-portrait[data-portrait-key="MC025"]'),
        portraitA:!!document.querySelector('#scr-battle .tavern-portrait[data-portrait-key="MC001"]'),
        noBgm:G._questNoBgm===true&&!G._villageBgmActive,
        video:getComputedStyle(document.getElementById('reward-bg-video')).display};`);
    const sale = await saleScene();
    ok('交換の画面も背景は camp のまま（編成画面の背景に切り替えない）', sale.campBg && sale.video === 'none', sale);
    ok('交換の画面に行商人（B）だけを出す', sale.portrait && !sale.portraitA, sale);
    ok('交換の画面は BGM を流さない（環境音だけ）', sale.noBgm, sale);
    const exchange=await b.eval(`const gold=G.gold,count=G.mainBoard.filter(Boolean).length,stock=JSON.stringify(_rewCards);
      const empty=G.mainBoard.findIndex(c=>!c);takeRewCard(0);if(empty>=0)takeRewCard(0,empty);
      const blocked=JSON.stringify(_rewCards)===stock&&G.mainBoard.filter(Boolean).length===count&&!G._pendingPanelPlacement;
      let choice=null;for(let i=0;i<3&&!choice;i++)for(let slot=0;slot<G.mainBoard.length;slot++)if(canExchangeShopCardAt(i,slot)){choice={i,slot};break;}
      if(!choice)throw new Error('合法な行商人交換がない');const {i,slot}=choice;
      const outgoing=_exchangeShopCardCopy(G.mainBoard[slot]),incoming=_exchangeShopCardCopy(_rewCards[i]);
      _dragSrc={arr:'rew',idx:i};const allowed=_boardDropAllowedAt(slot);dropOnCard('boardCards',slot);
      const swapped=JSON.stringify(G.mainBoard[slot])===JSON.stringify(incoming)&&JSON.stringify(_rewCards[i])===JSON.stringify(outgoing);
      _dragSrc={arr:'rew',idx:i};dropOnCard('boardCards',slot);
      const returned=JSON.stringify(G.mainBoard[slot])===JSON.stringify(outgoing)&&JSON.stringify(_rewCards[i])===JSON.stringify(incoming);
      _dragSrc={arr:'rew',idx:i};dropOnCard('boardCards',slot);
      window.__peddlerSaved={stock:JSON.stringify(SaveRun.copy(_rewCards)),board:JSON.stringify(SaveRun.copy(G.mainBoard)),gold:G.gold};
      return {blocked,allowed,swapped,returned,gold:G.gold===gold,count:G.mainBoard.filter(Boolean).length===count};`);
    ok('空きマス・単独クリックで取得できない',exchange.blocked,exchange);
    ok('魔導店の共通ドラッグで交換・取り戻し、枚数とゴールドを維持',exchange.allowed&&exchange.swapped&&exchange.returned&&exchange.gold&&exchange.count,exchange);
    // 保存から再開しても行商人の画面へ戻る。
    await b.eval('SaveRun.checkpoint("reward");');
    const saved=await b.eval('return window.__peddlerSaved');
    await b.goto(URL); await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20', 20000);
    await b.eval('window.alert=()=>{};void SaveRun.continueRun();');
    await b.waitFor('document.body.classList.contains("shop-screen-active")&&G._isPeddler', 20000);
    const resumed = await b.eval('return {stock:JSON.stringify(SaveRun.copy(_rewCards)),board:JSON.stringify(SaveRun.copy(G.mainBoard)),gold:G.gold,btn:document.querySelector("#reward-move-btns .rew-move-btn")?.textContent}');
    const resumedScene = await saleScene();
    ok('再開しても camp の背景・行商人・BGM なし', resumedScene.campBg && resumedScene.portrait && resumedScene.noBgm, resumedScene);
    ok('再開しても交換後の店枠・盤面・ゴールドと「再戦」を維持',resumed.stock===saved.stock&&resumed.board===saved.board&&resumed.gold===saved.gold&&/再戦/.test(resumed.btn||''),resumed);
    // 「再戦」で同じ戦闘へ。行商人の旗は残らない。
    await b.eval('window.__intro=0;_playBattleStartIntro=async()=>{window.__intro++;return new Promise(()=>{})};document.querySelector("#reward-move-btns .rew-move-btn").click();');
    await b.waitFor('window.__intro>0', 20000);
    await b.eval('SaveRun.lockInput(false);');
    ok('再戦へ進み、行商人の旗・立ち絵・camp の背景を外す', await b.eval(`return !G._isPeddler&&!G._isShop&&G._waveIsRetry!==false
      &&!document.querySelector('.tavern-portrait[data-portrait-key="MC025"]')&&!document.body.classList.contains('facility-bg-active')`));
    // 2回目の敗北：会話は飛ばし、camp＋行商人の交換の画面（新在庫）。
    ok('2回目は会話なしで行商人が来る', await b.eval('return defeatPeddlerPending()&&!_defeatPeddlerTalkPending()'));
    await b.eval('window.__talk=0;const st=_qStartDialogue;_qStartDialogue=(...a)=>{window.__talk++;return st(...a);};G._battleDefeatHandled=false;void _finishWaveBattleDefeat(null);');
    await b.waitFor('typeof G._battleProceedAction==="function"', 20000);
    await b.eval('continueAfterBattleVictory();');
    await b.waitFor('document.body.classList.contains("shop-screen-active")&&G._isPeddler', 20000);
    const second = await saleScene();
    const secondShop = await b.eval('return {talk:window.__talk,stock:JSON.stringify(_rewCards),kinds:_rewCards.map(c=>!c?null:String(c.category||""))}');
    ok('2回目の敗北は会話なしで camp＋行商人の交換の画面（新しい3枚）', secondShop.talk === 0 && second.campBg && second.portrait && second.noBgm
      &&secondShop.kinds.length===3&&secondShop.kinds.every(k=>['キャラクター','エンチャント','強化'].includes(k))&&secondShop.stock!==saved.stock,{second,secondShop});
    const errs = b.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
    ok('ブラウザ例外なし', errs.length === 0, errs.slice(0, 3));
    console.log(`行商人イベント検査: ${checked}件OK`);
  } finally { await b.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
