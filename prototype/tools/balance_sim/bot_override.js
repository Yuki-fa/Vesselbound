'use strict';

const fs=require('node:fs');
const crypto=require('node:crypto');

function pools() { return {panel:PANEL_POOL,ring:RING_POOL,item:ITEM_POOL}; }
function kind(card) {
  return card.type==='ring'?'指輪':card.type==='consumable'?'アイテム':card.category==='強化'?'エンチャント':card.category;
}
function catalog() {
  return Object.values(pools()).flat().filter(c=>c && c._implemented!==false && !c.removed)
    .map(c=>({id:c.id,name:c.name,category:kind(c),rarity:c.rarity,grade:c.grade,
      rewardEligible:!c._rewardExcluded && c.rarity!==-1,shopEligible:!c._shopExcluded && c.rarity!==-1,
      initial:!!c.initial,desc:c.desc||'',power:c.power,life:c.life}));
}
function snapshot() {return Object.fromEntries(Object.entries(pools()).map(([k,v])=>[k,JSON.parse(JSON.stringify(v))]));}
function restore(saved) {for(const [k,v] of Object.entries(pools())) v.splice(0,v.length,...JSON.parse(JSON.stringify(saved[k])));}

function readOverride(file) {
  if (!file) return {change:[],add:[]};
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if (!data || typeof data!=='object' || Array.isArray(data)) throw new Error('override はオブジェクトを指定する');
  for(const key of Object.keys(data)) if(!['change','add'].includes(key)) throw new Error(`不明なoverrideキー: ${key}`);
  for(const key of ['change','add']) if(data[key]!==undefined&&!Array.isArray(data[key])) throw new Error(`${key} は配列を指定する`);
  return {change:data.change||[],add:data.add||[]};
}

function applyOverride(data,parsers) {
  const notes=[];
  const allowed=new Set(['id','name','category','power','life','rarity','grade','desc','keywords','directionCount','color',
    'cost','initial','mergedDesc','mergedKeywords']);
  const normalize=card=>{
    if (card.category==='キャラクター') parsers.character(card);
    if (card.category==='エンチャント') parsers.enchant(card);
  };
  for(const operation of ['change','add']) for(const [index,patch] of data[operation].entries()) {
    if(!patch || typeof patch.name!=='string'||!patch.name.trim()) throw new Error(`${operation}[${index}] に名前が必要`);
    for(const key of Object.keys(patch)) if(!allowed.has(key)) throw new Error(`不明なカード属性: ${key}`);
    for(const key of ['power','life','rarity','grade','cost','directionCount']) {
      if(patch[key]!==undefined && (typeof patch[key]!=='number'||!Number.isFinite(patch[key]))) throw new Error(`${patch.name}.${key} は有限数が必要`);
    }
    if(patch.directionCount!==undefined&&(!Number.isInteger(patch.directionCount)||patch.directionCount<0||patch.directionCount>4)) throw new Error('directionCount は0〜4');
    if(patch.desc!==undefined&&typeof patch.desc!=='string') throw new Error('desc は文字列');
    if(patch.keywords!==undefined&&(!Array.isArray(patch.keywords)||patch.keywords.some(k=>typeof k!=='string'))) throw new Error('keywords は文字列の配列');
    let card;
    if(operation==='change') {
      const matches=Object.values(pools()).flat().filter(c=>c.name===patch.name&&(!patch.category||kind(c)===patch.category));
      if(matches.length!==1) throw new Error(`変更先が一意でない: ${patch.name} (${matches.length}件)`);
      card=matches[0];
      if(patch.id!==undefined&&patch.id!==card.id) throw new Error('既存カードのid変更には対応しない');
      if(patch.category!==undefined&&patch.category!==kind(card)) throw new Error('既存カードの分類変更には対応しない');
    } else {
      if(Object.values(pools()).flat().some(c=>c.name===patch.name)) throw new Error(`追加名が重複: ${patch.name}`);
      if(!['キャラクター','エンチャント'].includes(patch.category)) throw new Error('仮カードの追加分類はキャラクター／エンチャント');
      const id=patch.id||`bot_${crypto.createHash('sha256').update(patch.name).digest('hex').slice(0,12)}`;
      if(Object.values(pools()).flat().some(c=>c.id===id)) throw new Error(`追加idが重複: ${id}`);
      card={id,name:patch.name,category:patch.category,type:'panel',kind:'panel',panelScope:'unit',slot:1,
        cost:1,rarity:1,grade:1,power:0,life:1,desc:'',keywords:[],directionCount:2,
        _sheetSeen:true,_implemented:true,_rewardAvailable:true,_shopAvailable:true,
        _sheetDescLoaded:true,_sheetKeywordsLoaded:true,initial:false};
      PANEL_POOL.push(card);
    }
    const before=JSON.parse(JSON.stringify(card));
    Object.assign(card,patch);
    if(card.type==='panel'&&(patch.desc!==undefined||patch.keywords!==undefined||operation==='add')) {
      // loaderの残留派生値を持ち越さず、本体のパーサーから再生成する。
      for(const key of ['manaOnAttack','manaOnInjury','manaOnDeath','goldOnDeath','goldOnBattleEnd',
        'randomItemOnBattleEnd','releaseAtkBonus','releaseHpBonus','_manaThresholdDesc']) delete card[key];
      const keywords=patch.keywords||before._mergedSource?.sheetKeywords||before.keywords||[];
      normalize(card);
      if(card.category==='キャラクター') card.keywords=Array.from(new Set([...(card.keywords||[]),...keywords]));
      else card.adjacentKeywords=Array.from(new Set([...(card.adjacentKeywords||[]),...(patch.keywords||[])]));
      if(patch.directionCount!==undefined) card.directionCount=patch.directionCount;
    }
    if(patch.mergedDesc!==undefined||patch.mergedKeywords!==undefined) {
      card._mergedSource={desc:patch.mergedDesc||'',keywords:(patch.mergedKeywords||[]).join(' '),sheetKeywords:patch.keywords||card.keywords||[]};
      parsers.merge(card);
    }
    notes.push({operation,name:card.name,category:kind(card),patch,before,after:JSON.parse(JSON.stringify(card)),
      interpretation:patch.desc===undefined?'数値のみ':card.type!=='panel'?'コアが解釈しない可能性：指輪・アイテムは既存の効果キーにも依存する':'動的プローブ待ち'});
  }
  return notes;
}

module.exports={pools,kind,catalog,snapshot,restore,readOverride,applyOverride};
