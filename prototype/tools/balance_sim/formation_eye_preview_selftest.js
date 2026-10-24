#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {initialize}=require('./run_bot');

async function testFormationEyePreview(api,check=(name,fn)=>{fn();console.log('OK '+name);}){
  function fresh(names){
    api.resetRun();initState();G.phase='reward';G._wave=1;
    G.rings=names.map(name=>clone(RING_POOL.find(r=>r.name===name)));
    G.mainBoard[1]=makePanel(PANEL_POOL.find(c=>c.no==='C009').id);G.mainBoard[1].directions=['left'];
    G.mainBoard[0]=makePanel('獰猛');G.mainBoard[0].directions=['right'];
    G.mainBoard[3]=makePanel(PANEL_POOL.find(c=>c.category==='キャラクター'&&c.color==='青'&&c.no==='C031').id);
    return _getPartyBoardUnit();
  }
  for(const names of [['虹の瞳の指輪'],['赤い瞳の指輪'],['鏡の指輪','虹の瞳の指輪']]){
    const board=fresh(names),before=clone(G.mainBoard),formation=buildBoardFormation(board,{persistEternal:false});
    assert.ok(formation.entries.find(e=>e.slotIdx===1).unit._deployedAtZeroHp,'獰猛でHP0となる再現条件');
    const state=createBattleState({rings:{p1:G.rings},sides:{p1:{units:formation.ordered.map(e=>e.unit)},p2:{units:[]}}});
    state.units.p1.forEach(u=>coreApplyOpeningRingsToUnitEarly(state,u,()=>{}));
    check('獰猛：'+names.join('＋')+'の編成数値・死亡表示用HPがコアの開戦値に一致する',()=>{
      for(const slot of [1,3]){
        const expected=state.units.p1.find(u=>u._mainBoardSlot===slot),actual=_panelCharacterPreviewStats(board,slot,board.boardCards[slot]);
        assert.deepEqual(actual,{atk:expected.atk,hp:expected.hp});assert.ok(actual.hp>0);
      }
      assert.equal(boardHasDeployableCharacter(board),true);assert.deepEqual(G.mainBoard,before);
    });
  }
  check('出撃判定：獰猛でHP0の体だけなら指輪なしで不可、瞳で正に戻れば可',()=>{
    const board=fresh([]);G.mainBoard[3]=null;assert.equal(boardHasDeployableCharacter(board),false);
    G.rings=[clone(RING_POOL.find(r=>r.name==='赤い瞳の指輪'))];assert.equal(boardHasDeployableCharacter(board),true);
    G.mainBoard[1].keywords=['封印99'];assert.equal(boardHasDeployableCharacter(board),false);
  });
}
if(require.main===module)initialize().then(api=>testFormationEyePreview(api)).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testFormationEyePreview};
