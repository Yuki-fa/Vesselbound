'use strict';
// ═══════════════════════════════════════
// tools/parity/online_pipeline.js — オンライン対戦の「経路」を検証する。
//
// これまでの検査（offline_online_regression 等）は core.js の中身だけを比べていた。
// しかし実際のオンラインは
//   buildSelfFormation()（versus.js）→ 対戦要求の組み立て（server_local.js）
//   → simulateOnlineBattle()（sim.js）→ createBattleState() → runBattleCore()
// という経路を通る。**この受け渡しで情報が落ちても、従来の検査は素通りする。**
// 実際、rings/items が {p1:[…],p2:[]} の形のまま p1 へ入れられ、
// Array.isArray 判定で弾かれて指輪が全て失われていた（光の指輪が効かない原因）。
//
//   1. ローカルサーバーを立てる（既定 http://127.0.0.1:5500）
//   2. node tools/parity/online_pipeline.js
// ═══════════════════════════════════════
const { launch } = require('./headless');

const BASE = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

(async () => {
  const b = await launch();
  try {
    await b.goto(BASE, 1200);
    await b.waitFor("typeof G!=='undefined' && typeof createBattleState==='function' && typeof PANEL_POOL!=='undefined' && PANEL_POOL.length>0");

    const r = await b.eval(`
      // server_local.js が組み立てるのと同じ形の setup を作り、
      // 実際に createBattleState() へ通して情報が残るかを見る。
      const selfFormation={
        units:[{id:'a',name:'テスト',atk:3,hp:5,maxHp:5,color:'青',keywords:[],
          desc:'死亡：ランダムな敵に3ダメージを与える。',
          _adjacentPanelAbilities:['逆襲'],
          effectData:{adjacentAbilities:['逆襲'],effectNames:[],effectTexts:[]}}],
        // buildSelfFormation() が返すのはこの形（配列ではない）
        rings:{p1:[{name:'光の指輪',unique:''}],p2:[]},
        items:{p1:[{id:'i1',itemEffectKey:'illusion_scroll'}],p2:[]},
      };
      const opponent={units:[{id:'b',name:'敵',atk:1,hp:9,maxHp:9,color:'黒',keywords:[],desc:''}],
        rings:[],items:[]};
      const pick=(v,side)=>{
        if(Array.isArray(v)) return v;
        if(v&&Array.isArray(v[side])) return v[side];
        if(v&&Array.isArray(v.p1)) return v.p1;
        return [];
      };
      const state=createBattleState({
        sides:{p1:{units:selfFormation.units},p2:{units:opponent.units}},
        resources:{p1:{mana:0,gold:0},p2:{mana:0,gold:0}},
        rings:{p1:pick(selfFormation.rings,'p1'),p2:pick(opponent.rings,'p2')},
        items:{p1:pick(selfFormation.items,'p1'),p2:pick(opponent.items,'p2')},
        summonDefs:PANEL_POOL,
      });
      const u=state.units.p1[0];
      return {
        指輪の数:(state.rings.p1||[]).length,
        光の指輪:(state.rings.p1||[]).filter(x=>x&&x.name==='光の指輪').length,
        アイテムの数:(state.items&&state.items.p1?state.items.p1.length:0),
        逆襲の数:typeof coreUnitKeywordCount==='function'?coreUnitKeywordCount(u,'逆襲'):-1,
        強化の能力:JSON.stringify(u._adjacentPanelAbilities||[]),
      };
    `);
    check('編成の指輪がコアへ届く', r.光の指輪 === 1, `指輪=${r.指輪の数}件 光の指輪=${r.光の指輪}`);
    check('編成のアイテムがコアへ届く', r.アイテムの数 === 1, `アイテム=${r.アイテムの数}件`);
    check('強化カードの効果がコアへ届く', r.逆襲 === undefined ? r.逆襲の数 === 1 : r.逆襲の数 === 1,
      `逆襲=${r.逆襲の数} 強化の能力=${r.強化の能力}`);

    // server_local.js が実際にその形で渡しているかをソースで検査する。
    const src = await b.eval(`
      const res=await fetch('js/online/server_local.js'); return await res.text();
    `);
    check('server_localが陣営ごとの配列を取り出している',
      /_sideList\(selfFormation && selfFormation\.rings, 'p1'\)/.test(src)
      && /_sideList\(selfFormation && selfFormation\.items, 'p1'\)/.test(src),
      '取り出しヘルパを通していない場合、指輪・アイテムが丸ごと失われる');

    // 実際に対戦を1回まわして、指輪・誘発が働くかを見る。
    // **合成したユニットではなく実カードを使う。** マナ閾値（manaCost）は
    // loader.js が効果文から算出する値で、手で組んだユニットには付かない。
    const sim = await b.eval(`
      if(typeof simulateOnlineBattle!=='function') return {結果:'simが無い'};
      const card=n=>{
        const c=PANEL_POOL.find(x=>x&&x.name===n);
        if(!c) return null;
        return {id:n,name:c.name,atk:Number(c.power)||1,hp:Number(c.life)||1,maxHp:Number(c.life)||1,
          color:c.color||'青',keywords:(c.keywords||[]).slice(),desc:String(c.desc||''),
          manaCost:Number(c.manaCost)||0,manaRepeat:!!c.manaRepeat,
          effectData:{manaCost:Number(c.manaCost)||0,manaRepeat:!!c.manaRepeat,
            manaThresholdDesc:String(c._manaThresholdDesc||''),extraManaThresholds:[]}};
      };
      const lich=card('リッチ'), wolf=card('ダイアウルフ'), king=card('スケルトンキング');
      if(!lich||!wolf||!king) return {結果:'カードが見つからない'};
      lich.hp=lich.maxHp=40; wolf.hp=wolf.maxHp=40; king.hp=king.maxHp=40;
      const out=simulateOnlineBattle({
        seed:12345,
        // スケルトンキングは攻撃時に召喚する＝戦闘中の召喚。
        // 光の指輪「常時：戦闘中に召喚される味方は結界1を得る」はここでのみ効く
        // （開戦時の召喚には付かないのが正しい）。
        sides:{p1:{units:[lich,wolf,king]},p2:{units:[{id:'e',name:'敵',atk:1,hp:400,maxHp:400,color:'黒',keywords:[],desc:''}]}},
        resources:{p1:{mana:9,gold:0},p2:{mana:0,gold:0}},
        rings:{p1:[{name:'光の指輪'}],p2:[]},
        items:{p1:[],p2:[]},
        summonDefs:PANEL_POOL,
      });
      const ev=out.events||[];
      return {
        ダイアウルフのマナ値:wolf.manaCost+'マナ毎='+wolf.manaRepeat,
        マナ閾値:ev.filter(e=>e.type==='mana_threshold').length,
        召喚:ev.filter(e=>e.type==='summon').map(e=>e.unit&&e.unit.name),
        光の指輪の結界:ev.filter(e=>e.type==='keyword_effect'&&e.reason==='light_ring').length,
      };
    `);
    const summons = sim.召喚 || [];
    check('オンラインでマナ効果が発動する', Number(sim.マナ閾値) >= 1,
      `マナ閾値=${sim.マナ閾値}件（${sim.ダイアウルフのマナ値}）`);
    check('オンラインでリッチの誘発召喚が出る',
      summons.filter(n => n === 'シャドウ').length >= 1,
      `召喚=${summons.join('→') || '（なし）'}`);
    check('オンラインで光の指輪が召喚体へ結界を付ける',
      Number(sim.光の指輪の結界) >= 1, `結界イベント=${sim.光の指輪の結界}件`);

    const errs = (await b.consoleErrors()).filter(e => !/404|Failed to load resource/.test(e));
    check('コンソールに例外が無い', errs.length === 0, errs[0] || 'なし');
  } finally { await b.close(); }

  let ng = 0;
  results.forEach(x => { if (!x.ok) ng++; console.log(`${x.ok ? 'OK ' : 'NG '}\t${x.name}\t${x.detail || ''}`); });
  console.log(`オンライン経路検証: NG ${ng}`);
  process.exitCode = ng ? 1 : 0;
})();
