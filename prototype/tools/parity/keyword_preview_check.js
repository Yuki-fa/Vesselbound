'use strict';
// キーワード表示（本文・キーワード説明・引用内トリガー）のブラウザ検査。
const { launch } = require('./headless');

const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const checks = [];
const check = (name, ok, detail='') => checks.push({name, ok:!!ok, detail});

(async()=>{
  const browser=await launch();
  try{
    await browser.goto(URL,2500);
    await browser.waitFor('typeof G!=="undefined"&&Array.isArray(PANEL_POOL)&&typeof mkCardEl==="function"&&typeof _formatPreviewHtml==="function"',20000);
    const result=await browser.eval(`
      G.phase='reward'; G._isShop=false; G._isForge=false;
      const names=['スケルトンキング','ヴリコラカス','サイクロプス','スキュラ','ワーム','メリュジーヌ','バジリスク','ウンディーネ','衝撃波','グリマルキン','スプリガン','ファナティック','栄光の歌','ナイトメア','アビス・バロン','ボーンチャリオット','報復の歌','魔鏡'];
      const out={};
      names.forEach(name=>{
        const card=PANEL_POOL.find(c=>c&&c.name===name);
        if(!card){ out[name]={missing:true}; return; }
        const prepared=_preparePanelCard(card);
        const el=mkCardEl(prepared,-1,'keyword-preview-check');
        const preview=el.getAttribute('data-preview')||'';
        const keywordPreview=el.getAttribute('data-keyword-preview')||'';
        const box=document.createElement('div');
        box.innerHTML=_formatPreviewHtml(preview);
        out[name]={
          preview,keywordPreview,html:box.innerHTML,
          keywordClasses:[...box.querySelectorAll('.preview-keyword')].map(x=>x.textContent),
          ownedClasses:[...box.querySelectorAll('.preview-owned-keywords strong')].map(x=>[x.textContent,x.className]),
          hasOwnedKeywordRow:!!box.querySelector('.preview-owned-keywords'),
          deathTriggers:[...box.querySelectorAll('.effect-trigger-label.trigger-death')].map(x=>x.textContent)
        };
      });
      return out;
    `);
    const get=name=>result[name]||{};
    ['スケルトンキング','スキュラ'].forEach(name=>{
      const r=get(name);
      const keyword=name==='スキュラ'?'毒1':'復活';
      const ownedOk=!r.hasOwnedKeywordRow||r.ownedClasses.some(x=>x[0]===keyword&&x[1]==='preview-keyword');
      check(`${name} 本文キーワードが共通クラス`,!r.missing&&r.keywordClasses.includes(keyword)&&ownedOk,JSON.stringify(r));
    });
    const descCases={
      'スケルトンキング':'復活：','ヴリコラカス':'復活：','サイクロプス':'全体攻撃：',
      'スキュラ':'毒X：','ワーム':'毒X：','メリュジーヌ':'毒X：','バジリスク':'即死：',
      'ウンディーネ':'弱体X：','衝撃波':'弱体X：','グリマルキン':'結界X：',
      'スプリガン':'結界X：','ファナティック':'結界X：','栄光の歌':'結界X：',
      'ボーンチャリオット':'復活：'
    };
    Object.entries(descCases).forEach(([name,needle])=>check(`${name} 本文KWの説明`,!get(name).missing&&get(name).keywordPreview.includes(needle),get(name).keywordPreview));
    const nightmare=get('ナイトメア'), abyss=get('アビス・バロン');
    check('ナイトメア 封印Xを一体で太字',!nightmare.missing&&nightmare.keywordClasses.filter(x=>x==='封印X').length===1&&!/preview-keyword[^>]*>封印<\/strong>される/.test(nightmare.html),nightmare.html);
    check('アビス・バロン 封印∞を一体で太字',!abyss.missing&&abyss.keywordClasses.includes('封印∞'),abyss.html);
    check('ナイトメア 本文KWの封印X説明',!nightmare.missing&&nightmare.keywordPreview.includes('封印X：'),nightmare.keywordPreview);
    check('アビス・バロン 本文KWの封印X説明',!abyss.missing&&abyss.keywordPreview.includes('封印X：'),abyss.keywordPreview);
    const mana=['ヴリコラカス','サイクロプス','スキュラ','ウンディーネ','スプリガン'];
    mana.forEach(name=>{
      const r=get(name);
      check(`${name} マナ効果をKW扱いしない`,!r.missing&&!r.keywordPreview.includes('マナ効果：')&&!/preview-keyword[^>]*>マナ効果<\/strong>/.test(r.html),`${r.keywordPreview} / ${r.html}`);
    });
    ['ボーンチャリオット','報復の歌'].forEach(name=>{
      const r=get(name);
      check(`${name} 引用内の死亡トリガー`,!r.missing&&r.deathTriggers.includes('死亡'),r.html);
    });
    const mirror=get('魔鏡');
    check('魔鏡の本文先頭「荷物」を保持',!mirror.missing&&mirror.preview.includes('荷物以外の全てのカードの3枚目として合体できる。'),mirror.preview);
  }catch(error){
    check('検査実行',false,error&&error.stack||String(error));
  }finally{
    await browser.close();
  }
  checks.filter(x=>!x.ok).forEach(x=>console.log(`NG ${x.name}: ${x.detail}`));
  const ng=checks.filter(x=>!x.ok).length;
  console.log(`キーワード表示検証: NG ${ng}`);
  if(ng) process.exitCode=1;
})();
