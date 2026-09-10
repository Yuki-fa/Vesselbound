'use strict';
const assert=require('node:assert/strict');
const {launch}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';

(async()=>{
  const browser=await launch();
  try{
    await browser.goto(URL);
    await browser.waitFor('typeof _rewardWeightedPick==="function"&&Array.isArray(PANEL_POOL)',20000);
    const result=await browser.eval(`
      const life=PANEL_POOL.find(p=>p&&p.name==='生命吸収'&&p.category==='エンチャント');
      const oldRunRandom=window.runRandom;
      const defs=[1,2,3,4,5].map(r=>({id:'r'+r,rarity:r,grade:1}));
      const pickAt=rarityRoll=>{
        const values=[0,rarityRoll,0];
        window.runRandom=()=>values.length?values.shift():0;
        return _rewardWeightedPick(defs,1,new Set(),false,true)?.rarity;
      };
      const boundaries=[0,.539999,.54,.759999,.76,.899999,.90,.979999,.98,.999999].map(pickAt);
      window.runRandom=oldRunRandom;
      const sameBucket=PANEL_POOL.filter(p=>p&&p.category==='エンチャント'
        &&Number(p.grade)===4&&Number(p.rarity)===5&&p._implemented!==false&&!p._rewardExcluded);
      return {life:{no:life&&life.no,grade:life&&life.grade,rarity:life&&life.rarity},
        boundaries,sameBucket:sameBucket.map(p=>p.name)};
    `);
    assert.equal(String(result.life.no).replace(/^E/,''),'023','生命吸収の正式No.');
    assert.equal(result.life.grade,4,'生命吸収のグレードがマスターと違う');
    assert.equal(result.life.rarity,5,'生命吸収のレアリティがマスターと違う');
    assert.deepEqual(result.boundaries,[1,1,2,2,3,3,4,4,5,5],
      'レアリティ54/22/14/8/2の境界どおりに枠を抽選していない');
    const perSlot=.5*.05*.02/Math.max(1,result.sameBucket.length);
    console.log(`OK 生命吸収 E023 grade=${result.life.grade} rarity=${result.life.rarity}`);
    console.log(`grade4/rarity5強化=${result.sameBucket.join('、')}（1枠あたり理論値 ${(perSlot*100).toFixed(4)}%）`);
  }finally{
    await browser.close();
  }
})().catch(error=>{ console.error(error); process.exitCode=1; });
