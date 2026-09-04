'use strict';
// ═══════════════════════════════════════
// tools/parity/anim_check.js — アニメーション・見た目の自動検証。
//
// ヘッドレスChrome（tools/parity/headless.js）で実際にページを動かして測る。
// Claudeのブラウザペインは document.hidden=true で rAF もCSSトランジションも進まないため、
// **アニメーションの検証はこちらを使うこと。**
//
//   1. ローカルサーバーを立てる（既定 http://127.0.0.1:5500）
//   2. node tools/parity/anim_check.js
//   3. 失敗した項目は NG と実測値が出る
//
// 失敗しても勝手に閾値を緩めないこと。実測値が変わった理由を先に突き止める。
// ═══════════════════════════════════════
const { launch } = require('./headless');

const BASE = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

const SETUP = `
  const el=document.getElementById('scr-battle');
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  el.classList.add('active'); document.body.className='';
  if(typeof setScreenAssetBackground==='function') setScreenAssetBackground('battle','stage1');
  const mk=(id,lane,slot)=>({id,name:id,lane,slot,atk:3,hp:50,maxHp:50,color:'赤',keywords:[],desc:'',_panelSummoned:true});
  G.enemies=new Array(14).fill(null); G.enemies[0]=mk('E1','front',0);
  G.allies =new Array(14).fill(null); G.allies[0]=mk('A1','front',0);
  renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
  await new Promise(r=>requestAnimationFrame(r));
`;

(async () => {
  const b = await launch();
  try {
    await b.goto(BASE, 2500);

    // ── 0. 前提：実ブラウザとして動いているか ──
    const env = await b.eval(`
      const t0=performance.now();
      const fired=await Promise.race([
        new Promise(r=>requestAnimationFrame(()=>r(Math.round(performance.now()-t0)))),
        new Promise(r=>setTimeout(()=>r(-1),1500))]);
      return { hidden:document.hidden, rAF:fired, cards:(typeof PANEL_POOL!=='undefined'&&PANEL_POOL)?PANEL_POOL.length:0 };
    `);
    check('ページが可視でrAFが動く', env.hidden === false && env.rAF >= 0, `hidden=${env.hidden} rAF=${env.rAF}ms`);
    check('カードデータが読み込める', env.cards > 0, `${env.cards}件`);

    // ── 1. 攻撃モーション：実際に動き、複製と実カードが同時に見えないこと ──
    const motion = await b.eval(SETUP + `
      const t0=performance.now(); let prev=null; const timeline=[]; const xs=[];
      const snap=()=>{
        const clone=document.querySelector('.attack-motion-clone');
        const slot=document.querySelector('#f-ally .slot[data-unit-id="A1"]');
        const s=(clone?'C':'-')+(slot?(getComputedStyle(slot).visibility==='hidden'?'H':'V'):'x');
        if(s!==prev){ timeline.push({t:Math.round(performance.now()-t0), s}); prev=s; }
        if(clone){ const m=(getComputedStyle(clone).transform||'').match(/matrix\\(([^)]+)\\)/);
          if(m) xs.push(Math.round(Number(m[1].split(',')[5]))); }
      };
      snap(); beginBattleMotion(); snap();
      const p=playAttackMotion(G.allies[0],G.enemies[0],false,null,
        {stopRatio:.25,firstDuration:260,secondDuration:360,returnDuration:420});
      while(performance.now()-t0<1500){ await new Promise(r=>requestAnimationFrame(r)); snap(); }
      await p; endBattleMotion();
      await new Promise(r=>requestAnimationFrame(r)); snap();
      const slot=document.querySelector('#f-ally .slot[data-unit-id="A1"]');
      return { timeline, 到達距離:Math.min(...xs), サンプル数:xs.length,
        二重表示のフレーム:timeline.filter(x=>x.s==='CV').length,
        終了後スロット:slot?getComputedStyle(slot).visibility:'なし',
        複製残り:!!document.querySelector('.attack-motion-clone') };
    `);
    check('攻撃モーションが実際に動く', motion.サンプル数 > 5 && motion.到達距離 < -50,
      `サンプル${motion.サンプル数}回 最大移動${motion.到達距離}px`);
    check('複製と実カードが同時に見えない', motion.二重表示のフレーム === 0,
      `二重区間=${motion.二重表示のフレーム}回 timeline=${JSON.stringify(motion.timeline)}`);
    check('モーション後に複製が消え実カードが戻る', !motion.複製残り && motion.終了後スロット === 'visible',
      `複製残り=${motion.複製残り} スロット=${motion.終了後スロット}`);

    // ── 2. エリート／ボスの背景スライドが画面下端で止まること ──
    const bg = await b.eval(`
      const el=document.getElementById('scr-battle');
      el.classList.remove('battle-bg-normal','battle-bg-reveal','battle-bg-scroll-ready','battle-bg-scrolling');
      el.classList.add('battle-bg-reveal'); void el.offsetWidth;
      const read=()=>getComputedStyle(el,'::before').backgroundPosition;
      const start=read();
      el.classList.add('battle-bg-scroll-ready'); void el.offsetWidth; el.classList.add('battle-bg-scrolling');
      const t0=performance.now();
      while(performance.now()-t0<3600){ await new Promise(r=>requestAnimationFrame(r)); }
      return { start, end:read() };
    `);
    check('背景スライドが下端で終わる', /100%/.test(bg.end), `開始=${bg.start} 終了=${bg.end}`);

    // ── 2b. 同じキャラへの連続ダメージで数値が重ならないこと ──
    const dmg = await b.eval(SETUP + `
      G.allies[1]={id:'A2',name:'A2',lane:'front',slot:1,side:'p1',atk:3,hp:50,maxHp:50,color:'赤',keywords:[],desc:'',_panelSummoned:true};
      renderField('f-ally',G.allies,false);
      await new Promise(r=>requestAnimationFrame(r));
      const state={units:{p1:G.allies,p2:G.enemies},resources:{p1:{mana:0,gold:0},p2:{mana:0,gold:0}},rings:{p1:[],p2:[]},items:{p1:[],p2:[]}};
      const evs=[{type:'damage',side:'p2',unitId:'E1',amount:3,effect:true,sourceId:'A1'},
                 {type:'damage',side:'p2',unitId:'E1',amount:4,effect:true,sourceId:'A1'}];
      const t0=performance.now(); const counts=[]; const labels=[];
      const p=_flushCorePveHitEvents(state,evs,new Set([G.allies[0],G.enemies[0]]));
      while(performance.now()-t0<2200){ await new Promise(r=>requestAnimationFrame(r));
        counts.push(document.querySelectorAll('.damage-vfx-host').length);
        labels.push(document.querySelectorAll('.damage-label-host').length); }
      await p;
      return { 同時最大:Math.max(...counts), 数値の同時最大:Math.max(...labels),
        表示された合計フレーム:counts.filter(n=>n>0).length };
    `);
    // 見るのは**数値**が重なっていないこと。同じ種類のダメージは畳みかけて出すため、
    // 命中VFX（.damage-vfx-host）は前の1枚が薄れている間に次が乗る＝重なって当然。
    // 以前はVFXの枚数を数えており、規則どおりの連続再生でも落ちていた。
    check('同じキャラへの連続ダメージで数値が重ならない', dmg.数値の同時最大 <= 1,
      `数値の同時最大=${dmg.数値の同時最大}件（命中VFX=${dmg.同時最大}件）`);
    check('ダメージ数値が実際に表示される', dmg.表示された合計フレーム > 10,
      `表示フレーム=${dmg.表示された合計フレーム}`);

    // ── 2c. マナ効果VFXはキャラクターごとに1回だけ ──
    const mana = await b.eval(SETUP + `
      const state={units:{p1:G.allies,p2:G.enemies},resources:{p1:{mana:5,gold:0},p2:{mana:0,gold:0}},rings:{p1:[],p2:[]},items:{p1:[],p2:[]}};
      // 同じキャラの閾値イベントを3回、別キャラを1回
      G.allies[1]={id:'A2',name:'A2',lane:'front',slot:1,side:'p1',atk:3,hp:50,maxHp:50,color:'赤',keywords:[],desc:'',_panelSummoned:true};
      renderField('f-ally',G.allies,false); await new Promise(r=>requestAnimationFrame(r));
      const evs=[{type:'mana_threshold',side:'p1',unitId:'A1',cost:1,desc:'このキャラクターは+1/+1を得る。'},
                 {type:'mana_threshold',side:'p1',unitId:'A1',cost:1,desc:'このキャラクターは+1/+1を得る。'},
                 {type:'mana_threshold',side:'p1',unitId:'A1',cost:1,desc:'このキャラクターは+1/+1を得る。'},
                 {type:'mana_threshold',side:'p1',unitId:'A2',cost:1,desc:'このキャラクターは+1/+1を得る。'}];
      let peak=0; const t0=performance.now();
      const p=_flushCorePveHitEvents(state,evs,new Set([G.allies[0],G.allies[1],G.enemies[0]]));
      while(performance.now()-t0<1600){ await new Promise(r=>requestAnimationFrame(r));
        peak=Math.max(peak,document.querySelectorAll('.damage-vfx-host').length); }
      await p;
      return { 同時に出たVFXの最大:peak };
    `);
    // ── マナ効果VFXが「実際に見えているか」──
    // 要素の数だけ数えても、素材のデコードが間に合わず1コマも描かれない場合を見逃す。
    // マナ効果の素材は6.6MBあり、hitDuration:900・960msで破棄という短い尺に間に合わない。
    const manaVisible = await b.eval(SETUP + `
      const rect=document.querySelector('#f-ally .slot[data-unit-id="A1"]').getBoundingClientRect();
      const t0=performance.now();
      let 見えたフレーム=0, 最大幅=0, 素材='', 生成された=false, 消えた時刻=0;
      const p=playHitVfxAtRect({left:rect.left,top:rect.top,width:rect.width,height:rect.height},0,{
        keywordEffect:'マナ効果',gateMs:0,hitDuration:900,fadeDuration:700,vfxScale:.5,spin:true});
      while(performance.now()-t0<2600){
        await new Promise(r=>requestAnimationFrame(r));
        const host=document.querySelector('.damage-vfx-host');
        if(host) 生成された=true; else if(生成された&&!消えた時刻) 消えた時刻=Math.round(performance.now()-t0);
        const img=host&&host.querySelector('img,video,canvas');
        if(!img) continue;
        素材=String(img.currentSrc||img.src||'').split('/').pop();
        const r=img.getBoundingClientRect();
        const op=Number(getComputedStyle(img).opacity);
        if(r.width>4&&r.height>4&&op>0.05&&(img.naturalWidth===undefined||img.naturalWidth>0)){
          見えたフレーム++; 最大幅=Math.max(最大幅,Math.round(r.width));
        }
      }
      await p;
      return {見えたフレーム,最大幅,素材,消えた時刻};
    `);
    check('マナ効果VFXが実際に見えている',
      manaVisible.見えたフレーム >= 10 && manaVisible.最大幅 > 20,
      `見えたフレーム=${manaVisible.見えたフレーム} 最大幅=${manaVisible.最大幅}px 素材=${manaVisible.素材} 消滅=${manaVisible.消えた時刻}ms`);
    // 素材の取り違えは「出ている」ようにしか見えないので、名前まで確かめる。
    // シートのキーワードNo.が振り直されると、登録が外れて通常の被弾VFX（hit.webp）へ
    // 落ちたり、別のキーワードの素材を拾ったりする。
    check('マナ効果VFXが専用素材である',
      /K023/.test(manaVisible.素材),
      `素材=${manaVisible.素材}（hit.webpなら通常の被弾VFXに化けている）`);
    const kwVfx = await b.eval(`
      return {マナ効果:getKeywordEffectVfxPath('マナ効果'), 毒:getKeywordEffectVfxPath('毒'),
        貫通:getKeywordEffectVfxPath('貫通')};
    `);
    check('キーワード専用VFXの割り当てが正しい',
      /K023/.test(kwVfx.マナ効果) && /K017/.test(kwVfx.毒) && !kwVfx.貫通,
      `マナ効果=${kwVfx.マナ効果||'(なし)'} 毒=${kwVfx.毒||'(なし)'} 貫通=${kwVfx.貫通||'(なし)'}`);

    check('マナ効果VFXがキャラクターごとに1つ', mana.同時に出たVFXの最大 <= 2,
      `同時最大=${mana.同時に出たVFXの最大}件（対象2キャラなので2以下が正しい）`);

    // ── 2d. 効果そのもののVFX（活性化＝E045）が出せること ──
    // マナ効果VFX（K023）の逆再生開始から、その効果自身のVFXへ引き継ぐ。
    // 命中VFXの経路（characterEffect＝CXXXのみ）では強化カードの素材を引けない。
    const sustain = await b.eval(SETUP + `
      const handle=typeof playEffectVfxOnUnit==='function'
        ?playEffectVfxOnUnit(G.allies[0],'ally','E045',{}):null;
      if(!handle) return {開始:false,見えたフレーム:0,最大幅:0,素材:'',停止後:-1,素材無しでnull:false};
      let 見えたフレーム=0,最大幅=0,素材='';
      const t0=performance.now();
      while(performance.now()-t0<1800){
        await new Promise(r=>requestAnimationFrame(r));
        const img=document.querySelector('.effect-sustain-host img');
        if(!img) continue;
        素材=String(img.currentSrc||img.src||'').split('/').pop();
        const rr=img.getBoundingClientRect();
        const op=Number(getComputedStyle(img).opacity);
        if(rr.width>4&&rr.height>4&&op>0.05&&img.naturalWidth>0){
          見えたフレーム++; 最大幅=Math.max(最大幅,Math.round(rr.width));
        }
      }
      await handle.stop();
      await new Promise(r=>setTimeout(r,120));
      // 素材が登録されていない効果では何も出さない（通常の被弾VFXへ化けないこと）。
      const 素材無し=playEffectVfxOnUnit(G.allies[0],'ally','C012',{});
      return {開始:true,見えたフレーム,最大幅,素材,
        // 期待するファイル名は assets.js の登録から引く。**ここに素材名を直接書かない**
        // （素材名が変わるたびに検査が落ちる。実際にE045.webp→S008.webpで落ちた）。
        期待素材:String(getEffectVfxPath('E045')||'').split('/').pop(),
        停止後:document.querySelectorAll('.effect-sustain-host').length,
        素材無しでnull:素材無し===null};
    `);
    check('効果固有VFXが実際に見えている',
      sustain.開始 && sustain.見えたフレーム >= 30 && sustain.最大幅 > 20
      && !!sustain.期待素材 && String(sustain.素材).startsWith(sustain.期待素材),
      `見えたフレーム=${sustain.見えたフレーム} 最大幅=${sustain.最大幅}px `
      + `素材=${sustain.素材 || '(なし)'} 期待=${sustain.期待素材 || '(未登録)'}`);
    check('効果固有VFXが停止で必ず消える', sustain.停止後 === 0,
      `停止後の残り=${sustain.停止後}件`);
    check('素材の無い効果では固有VFXを出さない', sustain.素材無しでnull === true,
      `C012（ギガンテス）=${sustain.素材無しでnull ? '出さない' : '出してしまう'}`);

    // ── 3. コンソールに例外が出ていないこと（404は素材未配置なので除外） ──
    const errs = b.consoleErrors().filter(x => !/404|Failed to load resource/.test(x));
    check('コンソールに例外が無い', errs.length === 0, errs.slice(0, 3).join(' / ') || 'なし');
  } finally { await b.close(); }

  results.forEach(r => console.log(`${r.ok ? 'OK ' : 'NG '}\t${r.name}\t${r.detail}`));
  const ng = results.filter(r => !r.ok).length;
  console.log(`アニメーション検証: ${ng === 0 ? 'NG 0' : `NG ${ng}`}`);
  process.exitCode = ng ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
