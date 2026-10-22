#!/usr/bin/env node
'use strict';

// AIの役割推定だけを行う。効果の実行・数値・キーワード定義は本体へ任せる。
const fs=require('node:fs'),path=require('node:path');
const {sheetRows}=require('./sheet_data');
const COLORS=['赤','青','緑','黄','紫'];
const keywordDefinitions=new Map(sheetRows('keyword').map(r=>[r['名前'],r['効果']||'']));
const memo=new Map();
const family=token=>token.startsWith('color:')?'color':({manaEffect:'mana',release:'blood',death:'summon',deathEffect:'summon',injuryEffect:'injury',attackEffect:'attack',openingEffect:'attack',atkBuff:'growth',hpBuff:'growth',enchant:'keywords',colors:'color'}[token]||token);
const ARCHETYPES=[
  {id:'mana',name:'マナエンジン',tokens:['mana','manaEffect']},
  {id:'blood',name:'血と解放',tokens:['blood','release']},
  {id:'summon',name:'召喚と死亡',tokens:['summon','death','deathEffect']},
  {id:'color',name:'色の統一・多色',tokens:COLORS.map(c=>'color:'+c).concat('colors')},
  {id:'poison',name:'毒',tokens:['poison']},
  {id:'barrier',name:'結界と守り',tokens:['barrier','hpBuff']},
  {id:'injury',name:'負傷連鎖',tokens:['injury','injuryEffect']},
  {id:'attack',name:'連続攻撃',tokens:['attack','attackEffect','openingEffect']},
  {id:'keywords',name:'キーワード・接続',tokens:['keyword','enchant','atkBuff']},
];
function keywords(card){
  let list=[...(Array.isArray(card.keywords)?card.keywords:[]),...(card.adjacentKeywords||[])];
  // 名前による推測は、シート定義にあり効果文が空のキーワード専用強化だけ。
  if(!card.desc&&['強化','エンチャント'].includes(card.category)&&keywordDefinitions.has(card.name))list.push(card.name);
  return [...new Set(list.map(s=>String(s).replace(/[\dX∞]+$/,'')).filter(s=>keywordDefinitions.has(s)))];
}
function extract(card={}){
  const desc=String(card.desc||'').normalize('NFKC'),kw=keywords(card);
  const key=JSON.stringify([desc,kw,card.category,card.color,card.boon]);
  if(memo.has(key))return memo.get(key);
  const produces={},consumes={},local=new Set(),global=new Set(),rules=[];
  const put=(map,token,value=1)=>{map[token]=Math.max(map[token]||0,value);};
  const p=(t,v=1,team=false)=>{put(produces,t,v);if(team)global.add(t);},c=(t,v=1,host=false)=>{put(consumes,t,v);if(host)local.add(t);};
  function rule(id,re,fn){const m=desc.match(re);if(m){rules.push(id);fn(m);}}
  const character=card.category==='キャラクター',ring=card.category==='指輪'||card.type==='ring';
  if(character){
    // 通常の一度の死亡・被弾は弱い供給源。これだけでエンジン完成にはしない。
    p('death',.15);p('blood',.12);p('injury',.15);
    if(!kw.some(k=>['防戦','封印'].includes(k)))p('attack',.25);
    if(COLORS.includes(card.color)){p('color:'+card.color);p('colors',.4);}
  }
  if(kw.length)p('keyword',Math.min(2,kw.length*.6));
  for(const k of kw){
    if(k==='毒牙')p('poison',1.3);
    if(k==='結界')p('barrier');
    if(k==='復活'){p('death');p('blood',.8);}
    if(k==='根性')p('injury',.7);
    if(k==='二段攻撃'||k==='三段攻撃')p('attack',k==='三段攻撃'?2:1.3);
    if(k==='封印'){c('blood',1.4);p('release');}
  }
  const triggerHost=!ring;
  for(const [trigger,token] of [['攻撃','attack'],['負傷','injury'],['死亡','death'],['開戦','opening']]){
    if(new RegExp('(?:^|[。」「])(?:(?:攻撃|負傷|死亡)&)?'+trigger+'(?:&(?:攻撃|負傷|死亡))?[:：]').test(desc)){
      p(token+'Effect');if(token!=='opening')c(token,token==='attack'?.45:1,triggerHost);
    }
  }
  rule('mana-gain',/(?:(\d+|X)マナを得る|マナを(\d+|X)得る|得るマナは\+\d+|マナを\d+倍にする)/,m=>p('mana',Math.min(2.5,(Number(m[1]||m[2])||1)*.6+.6+(Number(card.boon?.manaDelta)||0)*.4)));
  rule('mana-threshold',/(\d+)マナ(毎)?[:：]/,m=>{c('mana',Math.min(2,2/Number(m[1]))*(m[2]?1.3:1));p('manaEffect');});
  rule('mana-scaling',/Xはマナ(?:の\d+倍)?に等しい/,()=>c('mana',1.6));
  rule('mana-amplifier',/マナ効果(?:は|を|の値)/,()=>c('manaEffect',1.1,triggerHost&&/このキャラクターの/.test(desc)));
  rule('blood-gain',/血を(?:(\d+)得る|得る)|追加で血を得る/,m=>p('blood',Math.min(2.5,(Number(m[1])||1)*.5+.5)));
  rule('blood-use',/血が\d+以上|Xは(?:現在の)?血(?:の\d+倍)?に等しい|解放[:：]/,()=>c('blood',1.3));
  rule('release-watch',/解放された時|解放効果/,()=>c('release',1.2,triggerHost&&/このキャラクターの解放効果/.test(desc)));
  rule('summon-create',/(?:を(?:\d+体)?召喚(?:する|し)|コピーを(?:\d+体)?召喚(?:する|し))/,()=>{p('summon',1.4);p('death',.9);p('blood',.65);});
  rule('mana-gain-amplifier',/得るマナは\+\d+/,()=>c('mana',1));
  rule('summon-use',/召喚された|召喚されるたび|召喚したキャラクター|味方の眷属/,()=>c('summon',1.2,/このキャラクターが召喚した/.test(desc)));
  rule('revival-grant',/復活(?:を得る|を永久付与|する)/,()=>{p('death');p('blood',.8);});
  rule('death-watch',/(?:味方|キャラクター|敵|前衛の味方)が(?:死亡するたび|死んだ時|全滅した時)|この戦闘で死亡した|最初に死んだ味方/,()=>c('death',1.1));
  rule('effect-death',/死亡効果/,()=>c('deathEffect',1.1,triggerHost));
  rule('effect-injury',/負傷効果/,()=>c('injuryEffect',1.1,triggerHost&&/このキャラクターの/.test(desc)));
  rule('effect-attack',/攻撃効果/,()=>c('attackEffect',1.1,triggerHost&&/このキャラクターの/.test(desc)));
  rule('effect-opening',/開戦効果/,()=>c('openingEffect',1.1,triggerHost&&/このキャラクターの/.test(desc)));
  rule('injury-create',/(?:全ての(?:味方|キャラクター)(?:に|は).*?(?:\d+|X)ダメージ|このキャラクターは\d+ダメージを.*?受ける|代わりに受ける|ダメージ.*分散)/,()=>p('injury',1.3,/全ての(?:味方|キャラクター)(?:に|は)/.test(desc)));
  rule('injury-watch',/負傷している敵|受けたダメージに等しい/,()=>c('injury',1));
  rule('attack-more',/攻撃回数は\d+回追加|(?:前に|代わりに|直ちに)攻撃(?:させる|する)/,()=>p('attack',1.3,/味方の攻撃回数/.test(desc)));
  rule('attack-watch',/味方が(?:\d+回)?攻撃するたび/,()=>c('attack',1.1));
  rule('barrier-gain',/(?:味方|キャラクター|眷属)(?:は.*?結界\d*を得る|に結界\d*を(?:与える|付与する))|結界\d*を永久付与|結界\d*を得て/,()=>p('barrier',1.2));
  rule('barrier-use',/結界を失うたび/,()=>c('barrier',1.2));
  rule('poison-create',/敵に毒\d+を与える/,()=>p('poison',1.3));
  rule('poison-use',/敵の毒を|敵が得る毒/,()=>c('poison',1.3));
  rule('color',/(?:[赤青緑黄紫]の味方|同じ色の味方|味方の色の数|全ての色の味方|異なる色の味方)/,()=>{
    const colors=[...desc.matchAll(/([赤青緑黄紫])(?:、[赤青緑黄紫])*の味方/g)].flatMap(m=>[...m[0].matchAll(/[赤青緑黄紫]/g)].map(x=>x[0]));
    if(/同じ色の味方/.test(desc))c('color:self',.9);
    for(const color of colors)c('color:'+color,.9);
    if(/味方の色の数|全ての色の味方|異なる色の味方/.test(desc))c('colors',1);
  });
  rule('multicolor',/味方はマルチカラー/,()=>{for(const color of COLORS)p('color:'+color);p('colors',2);});
  rule('keyword-count',/キーワードの数/,()=>c('keyword',1.2,true));
  rule('enchant-count',/接続しているエンチャントの数/,()=>c('enchant',1.1,true));
  if(['エンチャント','強化'].includes(card.category))p('enchant',.5);
  rule('stat-gain',/(?:\+\d+\/\+\d+|(?:ATK|HP)\+\d+|ATKとHPを\d+倍|(?:ATK|HP)を\d+倍)/,()=>{if(!/全ての敵は\+/.test(desc)){const team=/全ての(?:味方|仲間)|ランダムな.*味方/.test(desc);p('atkBuff',.7,team);p('hpBuff',.7,team);}});
  rule('stat-use',/このキャラクターがATKを得るたび|XはこのキャラクターのATKに等しい/,()=>c('atkBuff',1,true));
  rule('hp-use',/XはこのキャラクターのHPに等しい|ATKは常にHPに等しい|このキャラクターのHP\d+につき/,()=>c('hpBuff',1,true));
  rule('same-effect',/この効果を持つ.*?味方/,()=>{
    const token='same:'+desc.replace(/(?:\d+|X)/g,'N');p(token);c(token,1);
  });
  // 条件語を拾っただけで全文を理解済みにしない。未対応の作用・補足を行単位で残す。
  const understood=/(?:マナ.*(?:得る|倍|追加|減らす)|血.*(?:得る|等しい|以上)|(?:召喚する|召喚され|召喚した)|(?:死亡|負傷|攻撃|開戦|解放)効果|ダメージ|毒.*(?:与える|発動|倍)|結界.*(?:得る|永久付与|失う)|復活|根性.*永久付与|\+[-\dX]+\/\+?[-\dX]+|[+-][\dX]+\/[+-][\dX]+|(?:ATK|HP)[+-]|(?:ATK|HP).*?(?:等しい|倍|奪う)|(?:キーワード|エンチャント|味方|色|血|ダメージ)の数|攻撃回数|攻撃させる|ゴールド|所持金|戦闘修正|封印[\dX∞]|この効果を持つ)/;
  const unknown=desc.split(/[。\n]/).map(s=>s.trim()).filter(s=>s&&!understood.test(s)&&!/^これを\d+回繰り返す|^Xは/.test(s));
  // 攻撃対象の変更や状態異常防止等は長期役割にせず、未対応表へ明示する。
  const result={produces,consumes,local:[...local],global:[...global],keywords:kw,rules,unknown};
  memo.set(key,result);return result;
}
function sheetCatalog(){
  return [['char','キャラクター'],['card','キャラクター'],['enchant','エンチャント'],['ring','指輪'],['item','アイテム']].flatMap(([sheet,category])=>sheetRows(sheet).map(r=>({
    no:r['No.']||'',name:r['名前'],category,color:r['カラー']||'',rarity:r['レアリティ']||'',grade:r['グレード']||'',
    implemented:r['実装'],desc:r['効果']||'',keywords:String(r['キーワード']||'').split(/[\s　]+/).filter(Boolean),
  })));
}
function writeTables(out){
  const {csv}=require('./run_report');fs.mkdirSync(out,{recursive:true});
  const cards=sheetCatalog(),rows=cards.map(card=>{const e=extract(card);return {no:card.no,name:card.name,category:card.category,color:card.color,rarity:card.rarity,grade:card.grade,implemented:card.implemented,
    keywords:e.keywords.join(' / '),produces:JSON.stringify(e.produces),consumes:JSON.stringify(e.consumes),local:e.local.join(' / '),global:e.global.join(' / '),rules:e.rules.join(' / '),unknown:e.unknown.join('。'),desc:card.desc};});
  const unknown=rows.filter(r=>r.unknown);
  csv(path.join(out,'synergy_cards.csv'),rows);csv(path.join(out,'synergy_unknown.csv'),unknown,['no','name','category','implemented','unknown','desc']);
  return {cards:rows.length,withEffect:rows.filter(r=>r.desc).length,unknownCards:unknown.length,unknownClauses:unknown.reduce((s,r)=>s+extract(cards.find(c=>c.no===r.no)).unknown.length,0),examples:unknown.slice(0,12).map(r=>({name:r.name,text:r.unknown}))};
}
if(require.main===module){const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--out'))throw Error('synergy.js [--out <dir>]');console.log(JSON.stringify(writeTables(path.resolve(args[1]||path.join(__dirname,'out'))),null,2));}
module.exports={extract,keywords,sheetCatalog,writeTables,COLORS,ARCHETYPES,family};
