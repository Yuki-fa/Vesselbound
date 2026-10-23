'use strict';

// 2026-10-23 シート改訂：名称、合体廃止、荷物廃止、キーワード説明、魔導板強化値をまとめて検査する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {sheetRows}=require('./sheet_data');
const {makeElement}=require('./stub');
console.table=()=>{};
require('./load');

const check=(name,fn)=>{fn();console.log(`OK ${name}`);};
const splitNames=value=>String(value||'').split(/[、,／\/]/).map(v=>v.trim()).filter(Boolean);

(async()=>{
  await loadGameData();

  check('地域施設は魔導取引所をショップとして読み、旧名も位置・名称解決できる',()=>{
    const regions=Object.values(REGION_INFO||{}).filter(info=>info&&Number(info.stage)>0&&info.townFacilities);
    assert.ok(regions.length>=5,'地域情報が読み込まれていない');
    assert.ok(regions.every(info=>splitNames(info.townFacilities).includes('魔導取引所')),
      '地域情報の魔導取引所が欠けている');
    assert.equal(VILLAGE_FACILITY_DEFS['魔導取引所'].key,'shop');
    assert.equal(villageFacilityNameVariants('魔導店')[0],'魔導取引所');
    initState();G._wave=1;G._isWaveAltar=false;
    const shop=villageFacilityList().find(f=>f.key==='shop');
    assert.ok(shop);assert.equal(shop.name,'魔導取引所');assert.equal(shop.label,'魔導取引所');
  });

  check('テキストは新キーを優先し、無い時は旧キーへ戻す',()=>{
    const oldLanguage=window.TEXT_MESSAGES_BY_LANGUAGE,oldMessages=window.TEXT_MESSAGES;
    const title=document.createElement('span');
    const oldQuery=document.querySelector,oldQueryAll=document.querySelectorAll;
    try{
      window.TEXT_MESSAGES_BY_LANGUAGE={1:{
        '「魔導店」説明開始':'旧説明開始','「魔導店」1':'旧手順1',
        '「魔導店」見出し':'魔導店','「魔導店の報酬枠」見出し':'魔導店の商品',
        '「行商人」見出し':'行商人',
      }};window.TEXT_MESSAGES=window.TEXT_MESSAGES_BY_LANGUAGE[1];
      assert.equal(_shopTutorialText('shop','説明開始','予備'),'旧説明開始');
      assert.equal(_shopTutorialText('shop','1','予備'),'旧手順1');
      document.querySelector=selector=>selector==='#reward-production-ui .reward-prod-title span'?title:null;
      document.querySelectorAll=()=>[];Object.assign(G,{phase:'reward',_isShop:true,_isItemShop:false,_isForge:false,_isLibrary:false,_facilityLabel:''});
      _syncRewardTitleLabel();assert.equal(title.textContent,'魔導取引所');
      const cssValues={},oldSetProperty=document.documentElement.style.setProperty;
      document.documentElement.style.setProperty=(key,value)=>{cssValues[key]=value;};
      applySheetCssTexts();
      document.documentElement.style.setProperty=oldSetProperty;
      assert.equal(cssValues['--title-shop'],'"魔導取引所の商品"');
      G._facilityLabel='魔導店';_syncRewardTitleLabel();assert.equal(title.textContent,'魔導取引所');
      G._isPeddler=true;G._facilityLabel='行商人';_syncRewardTitleLabel();assert.equal(title.textContent,'トレーダー');
      G._facilityLabel='行商';_syncRewardTitleLabel();assert.equal(title.textContent,'トレーダー');
      G._isPeddler=false;G._facilityLabel='';
      window.TEXT_MESSAGES_BY_LANGUAGE[1]['「魔導取引所」見出し']='新見出し';
      _syncRewardTitleLabel();assert.equal(title.textContent,'新見出し');
      const oldTalk=storyTalkEntry,oldLines=_storyTalkLines;
      try{
        storyTalkEntry=()=>({characterName:'行商 ガーラ'});_storyTalkLines=()=>[];
        assert.equal(defeatPeddlerTitle(),'トレーダー');
        window.TEXT_MESSAGES_BY_LANGUAGE[1]['「トレーダー」見出し']='新トレーダー';
        assert.equal(defeatPeddlerTitle(),'新トレーダー');
      }finally{storyTalkEntry=oldTalk;_storyTalkLines=oldLines;}
    }finally{
      window.TEXT_MESSAGES_BY_LANGUAGE=oldLanguage;window.TEXT_MESSAGES=oldMessages;
      document.querySelector=oldQuery;document.querySelectorAll=oldQueryAll;
    }
  });

  check('マージは旧スイッチを含めてPvE・オンラインとも停止し、関連品を抽選・使用させない',()=>{
    const source=fs.readFileSync('index.html','utf8');
    assert.doesNotMatch(source,/library-merge-btn|library-merge-desc/,'図書館のマージ入口が残っている');
    assert.equal(panelMergeEnabled(),false);PANEL_MERGE_TRIAL.enabled=true;assert.equal(panelMergeEnabled(),false);
    G._onlineMode=true;assert.equal(panelMergeEnabled(),false);G._onlineMode=false;PANEL_MERGE_TRIAL.enabled=false;
    initState();G.phase='reward';G.mainBoard[1]=makePanel('ノーム');G.mainBoard[3]=makePanel('ノーム');
    assert.equal(_mergedPanelCard(G.mainBoard[1],G.mainBoard[3]),null);
    assert.equal(_rewardMergeCandidate(0,makePanel('ノーム')),false);
    assert.equal(panelMergeContentAvailable({itemEffectKey:'bond_scroll'}),false);
    assert.equal(panelMergeContentAvailable({name:'魔鏡'}),false);
  });

  check('荷物キーワードを廃止し、Q007の木箱E102だけはカードとして残す',()=>{
    assert.equal(KW_DESC_MAP['荷物'],undefined);
    assert.equal(getKeywordAssetKey('荷物'),'');
    assert.equal(typeof _isLuggagePanel,'undefined');
    const e102=PANEL_POOL.find(card=>card&&card.no==='E102');
    assert.ok(e102,'E102 木箱が消えている');
    assert.ok(![...(e102.keywords||[]),...(e102.adjacentKeywords||[])].includes('荷物'));
    assert.ok(PANEL_POOL.every(card=>![...(card.keywords||[]),...(card.adjacentKeywords||[])].includes('荷物')),
      '新しいカード定義へ荷物キーワードが残っている');
  });

  check('マナ効果・起動効果の説明は本体と接続効果から検出し、辞書に無ければ出さない',()=>{
    const manaCard={name:'マナ説明検査',category:'キャラクター',keywords:[],desc:'2マナ毎：1ダメージを与える。',manaCost:2};
    const manaPreview=_keywordOnlyPreviewText(manaCard,manaCard.desc);
    assert.match(manaPreview,/マナ効果：/);assert.match(manaPreview,/戦闘中、指定のマナが溜まると一度だけ発動する/);
    const activationCard={name:'起動説明検査',category:'キャラクター',keywords:[],desc:'起動：1マナを得る。'};
    const oldActivation=KW_DESC_MAP['起動効果'];
    delete KW_DESC_MAP['起動効果'];
    assert.doesNotMatch(_keywordOnlyPreviewText(activationCard,activationCard.desc),/起動効果：/);
    KW_DESC_MAP['起動効果']='カードをクリックして起動する。';
    assert.match(_keywordOnlyPreviewText(activationCard,activationCard.desc),/起動効果：カードをクリックして起動する。/);
    const grouped=_groupedEnchantEffectTexts;
    try{
      _groupedEnchantEffectTexts=()=>({normalTexts:['2マナ：接続された効果。','起動：接続された起動。'],charTexts:[]});
      const connected={name:'接続先',category:'キャラクター',keywords:[],desc:''};
      const connectedPreview=_keywordOnlyPreviewText(connected,'',0);
      assert.match(connectedPreview,/マナ効果：/);assert.match(connectedPreview,/起動効果：カードをクリックして起動する。/);
      assert.match(_unitPreviewText(connected,'',0),/起動効果：カードをクリックして起動する。/);
    }finally{
      _groupedEnchantEffectTexts=grouped;
      if(oldActivation===undefined) delete KW_DESC_MAP['起動効果']; else KW_DESC_MAP['起動効果']=oldActivation;
    }
  });

  check('闇の力・魔の力は表示と戦闘で同じ補正を使い、移動すると元へ戻る',()=>{
    const lifePower=MAP_PANEL_POWERS.find(power=>power.id==='life');
    const manaPower=MAP_PANEL_POWERS.find(power=>power.id==='resonance');
    const summonPower=MAP_PANEL_POWERS.find(power=>power.id==='summon');
    assert.equal(lifePower.name,'闇の力');assert.equal(manaPower.name,'魔の力');
    const raw={name:'補正検査',category:'キャラクター',keywords:['封印3'],desc:'2マナ毎：効果。',manaCost:2,manaRepeat:true,power:2,life:3};
    const lifeCard=coreMapPanelPowerDisplayCard(raw,lifePower.desc);
    assert.equal(raw.keywords[0],'封印3');assert.equal(raw.desc,'2マナ毎：効果。');
    assert.equal(coreSealValue({...raw,_mapPanelPowerText:lifePower.desc}),0);
    assert.equal(coreSealValue(lifeCard),0);assert.ok(!_unitDisplayKeywords(lifeCard,lifeCard.desc).some(k=>/^封印/.test(k)));
    const battleLife={...raw,_mapPanelPowerText:lifePower.desc};coreInitSealStates([battleLife],()=>0);
    assert.equal(battleLife._sealed,undefined,'開戦時の封印値が表示計算と不一致');
    const manaCard=coreMapPanelPowerDisplayCard(raw,manaPower.desc);
    assert.equal(manaCard.desc,'1マナ毎：効果。');
    assert.equal(coreManaThresholdCost(manaCard,raw.manaCost),1);
    assert.equal(coreManaThresholdCost({...raw,_mapPanelPowerText:manaPower.desc},raw.manaCost),1);
    assert.match(_keywordOnlyPreviewText(manaCard,manaCard.desc),/マナ効果：/);
    const restored=coreMapPanelPowerDisplayCard(raw,summonPower.desc);
    assert.equal(restored.desc,raw.desc);assert.equal(coreSealValue(restored),3);assert.equal(coreManaThresholdCost(restored,2),2);
    const battleRestored={...raw};coreInitSealStates([battleRestored],()=>0);
    assert.equal(battleRestored._sealed,true);assert.equal(battleRestored._sealValue,3);
  });

  console.log('sheet_1023_regression: 6項目 OK');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
