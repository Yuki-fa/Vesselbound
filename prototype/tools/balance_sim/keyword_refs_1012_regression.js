'use strict';
// 2026-10-12 利用者指定: 全キーワードのシート番号と、固定した素材参照を独立に検査する。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sheetRows}=require('./sheet_data');
require('./load');
const ROOT=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');

(async()=>{
  console.table=()=>{};await loadGameData();
  const rows=sheetRows('keyword');
  assert.equal(new Set(rows.map(r=>r['名前'])).size,rows.length,'シートのキーワード名が重複');
  assert.deepEqual(Object.keys(KW_NO_MAP).sort(),rows.map(r=>r['名前']).sort(),'番号辞書に古い参照や登録漏れ');
  for(const row of rows){
    assert.equal(KW_NO_MAP[row['名前']],row['No.'],row['名前']+'のシート番号');
    assert.equal(KW_DESC_MAP[row['名前']],row['効果'],row['名前']+'の説明');
    assert.ok(Object.hasOwn(KEYWORD_ASSET_KEYS,row['名前']),row['名前']+'の素材対応が未定義');
  }
  const before=rows.map(row=>[getKeywordAssetKey(row['名前']),getKeywordEffectVfxPath(row['名前']),getKeywordEffectSfxKey(row['名前'])]);
  rows.forEach(row=>{KW_NO_MAP[row['名前']]='再採番:'+row['名前'];});
  assert.deepEqual(rows.map(row=>[getKeywordAssetKey(row['名前']),getKeywordEffectVfxPath(row['名前']),getKeywordEffectSfxKey(row['名前'])]),before,
    'シートの再採番で素材参照が変わった');
  rows.forEach(row=>{KW_NO_MAP[row['名前']]=row['No.'];});
  assert.equal(getKeywordAssetKey('熟練1'),'','熟練が旧弱体の素材を使う');
  const skillDesc=rows.find(r=>r['名前']==='熟練')['効果'];
  const display={id:'display',name:'表示対象',atk:3,hp:4,maxHp:4,keywords:['熟練1','熟練2'],desc:'',boardCards:[]};
  assert.ok(_unitDisplayKeywords(display,'',-1).includes('熟練3'),'カード欄で熟練Nが消える');
  assert.match(_unitPreviewText(display,'',-1),/キーワード：熟練3/);
  assert.ok(_keywordOnlyPreviewText(display,'',-1).includes('熟練X：'+skillDesc),'ツールチップがE052の本文を使う');
  assert.equal(_enchantKeywordDesc('熟練3'),skillDesc);
  assert.ok(_collectionDescriptionHtml(display,'character').includes('熟練3'),'図鑑の説明生成で熟練Nが消える');
  const enchant=PANEL_POOL.find(p=>p.no==='E052');
  assert.deepEqual(_enchantPreviewKeywords(enchant),[],'E052のカード名を所持キーワードと推測');
  assert.deepEqual(_enchantPreviewKeywords({...enchant,adjacentKeywords:['熟練']}),[],'旧E052の自己参照名が表示へ混ざる');
  assert.deepEqual(_enchantPreviewKeywords({name:'熟練3',desc:'',adjacentKeywords:['熟練3']}),['熟練3'],'同名の数値付きキーワードが表示から落ちる');
  for(const [name,scale] of [['毒牙',.5],['毒',.5],['衝撃',.4],['復活',.5]]){
    assert.equal(presentCharacterVfxScale(getKeywordAssetKey(name)),scale,name+'の倍率が変わった');
    const vfx=getKeywordEffectVfxPath(name);if(vfx)assert.ok(fs.existsSync(path.join(ROOT,vfx)));
  }
  for(const [name,variant,fx,peak] of [['弱体',null,'weaken',.2],['邪眼',null,'atk-down',.44],['全体攻撃',null,'all-cross',.04],
    ['復活',null,'revive-summon',.9],['結界','gain','shield-gain',.22],['復活','gain','revive-gain',.24]]){
    assert.deepEqual(presentLabFx(getKeywordAssetKey(name,variant)).slice(0,2),[fx,peak],name+'のLAB演出・SE同期が変わった');
  }
  // 素材定義のキー・パスは番号ではなく固定資産の識別子なので維持する。
  // 意味を決めるコードは、対応表を除いて番号の直書きを許可しない。
  const files=[];
  const walk=dir=>{for(const entry of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})){
    const file=dir+'/'+entry.name;if(entry.isDirectory())walk(file);else if(file.endsWith('.js'))files.push(file);
  }};walk('js');files.push('assets.js');
  for(const file of files.filter(f=>f!=='js/data/local_xlsx_data.js')){
    let source=read(file);
    if(file==='js/battle/present.js')source=source.replace(/const KEYWORD_ASSET_KEYS = Object.freeze\(\{[\s\S]*?\}\);/,'');
    if(file==='assets.js')source=source.replace(/const Assets = \{[\s\S]*?\n\};/,'');
    source=source.replace(/\/\*[\s\S]*?\*\//g,'');
    for(const [i,line]of source.split('\n').entries()){
      let code=line.replace(/\s*\/\/.*$/,'');
      // 音量設定とVFXの素材パスは既存定義を維持する。
      if(file==='js/engine/audio.js')code=code.replace(/^\s*K\d{3}(?:_gain)?\s*:/,'');
      if(file==='js/vfx/textures.js')code=code.replace(/'vfx\/K\d{3}\.webp'/g,"'素材パス'");
      assert.doesNotMatch(code,/\bK\d{3}(?:_gain)?\b/,file+':'+(i+1)+'に番号で意味を引く参照');
    }
    if(!['js/engine/state.js','js/data/loader.js'].includes(file))assert.doesNotMatch(source,/\bKW_NO_MAP\b/,file+'がシート番号を素材解決に使用');
  }
  console.log(`OK キーワード参照: 全${rows.length}名・再採番耐性・既存素材/倍率/LAB同期・番号直書き監査`);
})().catch(e=>{console.error(e);process.exitCode=1;});
