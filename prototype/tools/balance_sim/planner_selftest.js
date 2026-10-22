'use strict';

const assert=require('node:assert/strict');
const synergy=require('./synergy'),planner=require('./planner'),lookahead=require('./lookahead');
const sandbox=require('./bot_sandbox');
async function test(api,check,rows=[]){
  const catalog=synergy.sheetCatalog(),role=name=>synergy.extract(catalog.find(c=>c.name===name));
  check('役割抽出：活性化・マナ生成・Nマナ毎・マナ比例・解放・死亡/召喚の主要カード',()=>{
    assert.ok(role('活性化').consumes.mana>0);assert.equal(role('活性化').produces.mana,undefined);
    for(const name of ['ニンフ','マナの生成','サテュロス','ジャッカロープ'])assert.ok(role(name).produces.mana>0,name);
    for(const name of ['ドワーフ','アラクネ','天の雷槌','ダークワン'])assert.ok(role(name).consumes.mana>0,name);
    for(const name of ['オーバーロード','封印されしもの','ベヒーモス']){assert.ok(role(name).consumes.blood>0,name);assert.ok(role(name).produces.release>0,name);}
    for(const name of ['ミテーラ','スケルトンキング','デスナイト','ツインデビル'])assert.ok(role(name).produces.summon>=1,name);
    for(const name of ['レヴナント','グリムリーパー','ヴァンパイアロード'])assert.ok(role(name).consumes.death>0,name);
    assert.ok(role('シャナ').consumes.summon>0);assert.ok(role('血の雫').produces.blood>=1);
    assert.ok(role('賢者の指輪').consumes.manaEffect>0);assert.ok(role('毒沼の指輪').consumes.poison>0);
    assert.ok(role('盾の巻物').produces.barrier>0);assert.ok(role('ケンタウロス').keywords.includes('熟練'));
    assert.ok(role('ラミア').produces.injuryEffect>0);assert.ok(role('ラミア').produces.deathEffect>0);
  });
  check('役割抽出：カード名をキーワードに混ぜず、敵への効果を味方の負傷/結界供給にしない',()=>{
    assert.deepEqual(role('活性化').keywords,[]);assert.deepEqual(role('マナの種').keywords,[]);
    assert.ok(role('毒の刃').keywords.includes('毒牙'));assert.ok(role('ゴーレム').keywords.includes('根性'));
    assert.equal(role('破滅の指輪').produces.barrier,undefined);
    assert.equal(role('竜の契約').produces.injury,undefined);
    assert.equal(role('ナーガ').produces.summon,undefined);
    assert.ok(synergy.extract({desc:'攻撃：未知の操作をする。'}).unknown.length>0);
    assert.ok(role('ドラゴネット').unknown.length>0,'未対応の変身を解析済み扱いにしない');
  });
  const fixed=require('./fixed_engine');await fixed.initialize();sandbox.configure({compute:fixed.fastCompute});
  await sandbox.isolated(async()=>{
    api.seed=319;api.cycle=1;api.resetRun();initState();SaveRun.begin();G._wave=1;G._waveStage=2;G._waveLife=3;G.gold=50;
    // 次戦は両方で勝てる耐久にし、直近の能力上昇と将来のマナ投資を比べる。
    G.mainBoard.fill(null);const body=makePanel('ゴーレム');body.power=50;body.life=200;G.mainBoard[1]=body;
    G.phase=null;goToReward();
    _rewCards=['活性化','内なる大力'].map(name=>makePanel(name));for(const c of _rewCards){c.directions=['up','left','right'];c._isOriginalReward=true;}
    const context={policy:'planner',color:'赤',plannerStage:'r1'};planner.refresh(context,'fixture');
    const before=structuredClone(G),offers=structuredClone(_rewCards),ref=G,random=Math.random;
    let calls=0;Math.random=()=>{calls++;return .5;};
    const chance=planner.forecast();
    const chosen=await lookahead.chooseCard(context);
    check('planner：未所持のマナ生成を将来引く見込みで、実コアでは弱い活性化を選ぶ',()=>{
      assert.ok(chance.chance.produces.mana>0&&chance.chance.produces.mana<1);
      assert.ok(!planner.entries().some(e=>e.role.produces.mana));
      assert.equal(_rewCards[chosen.action.index].name,'活性化');assert.equal(chosen.bestImmediate.name,'内なる大力');
      assert.ok(chosen.investment);assert.ok(chosen.value.immediate<chosen.bestImmediate.value.immediate);
      assert.ok(chosen.value.future>chosen.bestImmediate.value.future);assert.ok(chosen.value.total>chosen.bestImmediate.value.total);
      assert.equal(chosen.value.win,1);assert.equal(chosen.bestImmediate.value.win,1);
    });
    check('planner：予測がG・提示・Math.random・ラン乱数を汚染しない',()=>{
      assert.equal(G,ref);assert.deepEqual(G,before);assert.deepEqual(_rewCards,offers);assert.equal(calls,0);
    });Math.random=random;
    const stock=G.panelSaleStock;
    G.panelSaleStock=Object.fromEntries(PANEL_POOL.filter(c=>c?.id).map(c=>[panelSaleStockKey(c),0]));
    const noPartner=await lookahead.chooseCard(context);
    check('planner：将来の相手が在庫切れなら投資をやめ、次戦で強いカードを選ぶ',()=>{
      assert.equal(_rewCards[noPartner.action.index].name,'内なる大力');
      assert.equal(planner.forecast().chance.produces.mana,undefined);
    });G.panelSaleStock=stock;
    const pool=PANEL_POOL.filter(c=>c.category==='キャラクター'&&_isImplementedPoolCard(c)&&!c._rewardExcluded&&c.rarity!==-1);
    const early=planner.distribution(pool,1,2),late=planner.distribution(pool,3,3);
    const observed=await sandbox.isolated(()=>{
      G._wave=3;G._waveStage=3;G._runRngState=7331;const counts={};
      for(let i=0;i<8000;i++){const card=_rewardWeightedPick(pool,3,null,true,true);counts[card.id]=(counts[card.id]||0)+1;}
      return counts;
    },{seed:7331});
    check('入手確率：本体の抽選8000回と解析したカード別確率が一致する範囲',()=>{
      for(const {card,p} of late)assert.ok(Math.abs((observed[card.id]||0)/8000-p)<.02,`${card.name}: 確率差が2pt以上`);
    });
    check('入手見込み：本体の確率を正規化し、序盤の高レア制限・ステージ差・残り回数を反映',()=>{
      assert.ok(Math.abs(early.reduce((s,x)=>s+x.p,0)-1)<1e-8);assert.ok(Math.abs(late.reduce((s,x)=>s+x.p,0)-1)<1e-8);
      assert.ok(early.every(x=>x.card.rarity<=3));assert.ok(late.some(x=>x.card.rarity>=4&&x.p>0));
      assert.ok(chance.rewards>0&&chance.exchanges>0);
      G._wave=4;G._waveStage=_waveRouteForWave(4).length;
      const last=planner.forecast();assert.equal(last.rewards,0);assert.equal(last.exchanges,0);assert.deepEqual(last.chance.produces,{});
    });
    G._wave=1;G._waveStage=2;
    const activation=_rewCards[0];lookahead.apply(chosen.action);G.mainBoard[3]=makePanel('ニンフ');
    planner.refresh(context,'mana-arrived');
    const historyBefore=structuredClone(context.planner.weights);
    check('投資後：後からマナ生成を得ると、実際の接続先の活性化と噛み合う',()=>{
      assert.ok(planner.describe().pairs.some(p=>p.token==='mana'&&p.consumer===activation.name&&p.producer==='ニンフ'&&p.active));
      assert.ok(planner.describe().completed.includes('mana'));
    });
    G.mainBoard.fill(null);G.mainBoard[1]=makePanel('サイレン');G.mainBoard[3]=makePanel('ゴーレム');
    for(let i=0;i<4;i++)planner.refresh(context,'injury-transition');
    check('型の更新：実際のカードと接続の変化で重みと主方針が切り替わる',()=>{
      assert.notDeepEqual(context.planner.weights,historyBefore);assert.ok(context.planner.history.some(h=>h.dominant==='mana'));
      assert.equal(context.planner.history.at(-1).dominant,'injury');
      assert.ok(Math.abs(Object.values(context.planner.weights).reduce((s,v)=>s+v,0)-1)<1e-8);
    });
    // 同じ局所効果でも、別の本体へ接続すると相乗りしない。
    const local=[{key:'a',card:{name:'毒牙本体'},hosts:[1],weight:1,role:{produces:{keyword:1},consumes:{},local:[]}},
      {key:'b',card:{name:'策士'},hosts:[3],weight:1,role:{produces:{},consumes:{keyword:1},local:['keyword']}}];
    check('配置：本体限定の効果は、別キャラ上のキーワードから加点しない',()=>{
      assert.equal(planner.analyzeEntries(local).pairs.length,0);local[1].hosts=[1];assert.equal(planner.analyzeEntries(local).pairs.length,1);
    });
  });
  const runs=rows.filter(r=>r.policy==='planner');
  if(runs.length)check('planner実周回：未来のための採用・型の更新・後の組合せを記録',()=>{
    const investments=runs.flatMap(r=>r.actions.filter(a=>a.investment&&['take','exchange'].includes(a.type)));
    assert.ok(investments.length>0);for(const a of investments){assert.ok(a.forecast.future>a.bestImmediate.value.future);assert.ok(lookahead.immediateCompare(a.forecast,a.bestImmediate.value)<0);}
    assert.ok(investments.some(a=>a.name!==a.bestImmediate.name),'配置の差だけでなく、実際に別のカードへ投資する');
    assert.ok(runs.some(r=>r.planner.history.length>1));assert.ok(runs.some(r=>new Set(r.planner.history.map(h=>h.dominant)).size>1));
    assert.ok(runs.some(r=>r.synergy.pairs.some(p=>p.active)));
  });
}
module.exports={test};
