// ═══════════════════════════════════════
// move.js — 移動先選択・ノード遷移
// 依存: constants.js, state.js, events.js, pool.js, battle.js
// ═══════════════════════════════════════

function renderMoveSelect(opts){
  document.getElementById('mv-title').textContent=`行き先を選んでください`;
  document.getElementById('mv-hint').textContent=opts.length===1&&opts[0].nodeType==='battle'?'この道しかない…':'';
  const el=document.getElementById('mv-opts');
  el.innerHTML='';
  opts.forEach(opt=>{
    const nt=NODE_TYPES[opt.nodeType];
    const div=document.createElement('div');
    div.className=`mv-opt ${nt.cls}`;
    div.innerHTML=`<div class="mo-icon">${nt.icon}</div><div class="mo-name">${nt.label}</div><div class="mo-desc">${nt.desc}</div>`;
    div.onclick=()=>chooseMove(opt.nodeType);
    el.appendChild(div);
  });
}

function chooseMove(nt){
  G.prevNodeType=nt;
  G.floor++;
  if(G.floor>20){ showScreen('clear'); return; }
  if(nt==='battle'||nt==='boss'){
    // 強欲秘術：報酬フェイズで残ったゴールドを最大3まで持ち越す
    if(G.arcana&&G.arcana.id==='強欲') G.arcanaCarryGold=Math.min(G.gold,3);
    showScreen('battle'); startBattle();
  }
  else if(nt==='smithy'){
    // 洞窟の奥へ：戦力1.2倍の戦闘 + 報酬フェイズで1グレード高いキャラが提示される
    if(G.arcana&&G.arcana.id==='強欲') G.arcanaCarryGold=Math.min(G.gold,3);
    G._extraBattleMult=1.2;
    G._pendingCaveBonus=true;
    G._prevWasSmithy=2;
    showScreen('battle'); startBattle();
  }
  else if(nt==='rest'){
    // 湖の畔へ：戦力1.2倍の戦闘 + 敵が指輪を確定ドロップする
    if(G.arcana&&G.arcana.id==='強欲') G.arcanaCarryGold=Math.min(G.gold,3);
    G._extraBattleMult=1.2;
    G._pendingPondBonus=true;
    G._prevWasRest=2;
    showScreen('battle'); startBattle();
  }
  else if(nt==='shop') doShop();
  // chest は goToReward() 内で処理されるため、ここには到達しない
}

function takeCardToHand(card){
  if(!card) return;
  const isEquip=card.equip||card.kind==='equipment'||card.type==='ring';
  const isRing=!isEquip&&(card.kind==='summon'||card.kind==='passive'||!card.type);
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined) nc.usesLeft=nc.baseUses||randUses();
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  if(isEquip){
    delete nc._buyPrice;
    nc.noRewardUse=true;
    G.inventory=G.inventory||new Array(18).fill(null);
    const hi=G.inventory.findIndex(x=>!x);
    if(hi>=0) G.inventory[hi]=nc;
    else log(`インベントリが満杯です`,'bad');
  } else if(isRing){
    delete nc._buyPrice;
    for(let i=0;i<G.ringSlots;i++){
      if(!G.rings[i]){
        G.rings[i]=nc;
        if(nc.unique==='great_mother'){
          G.allies.forEach(a=>{ if(a&&a.effect==='dragonet_end') a._dragonetBonus=(a._dragonetBonus||0)+1; });
        }
        return;
      }
    }
  } else {
    const hi=G.spells.indexOf(null);
    if(hi>=0) G.spells[hi]=nc;
  }
}

// ═══════════════════════════════════════
// ワールドマップ進行
// ═══════════════════════════════════════

const WORLD_MAP_ENABLED=true;
const WORLD_MAP_W=8;
const WORLD_MAP_H=5;
const WORLD_MAP_NODE_COUNT=40;
const WORLD_MAP_TURN_LIMIT=30;
const WORLD_MAP_DIRS=[
  [1,0],[-1,0],[0,1],[0,-1],
  [1,1],[1,-1],[-1,1],[-1,-1],
];

function startWorldMapRun(){
  initWorldMap(1);
}

function initWorldMap(mapIndex){
  G.mapIndex=mapIndex;
  G.mapTurn=1;
  G.mapTurnLimit=WORLD_MAP_TURN_LIMIT;
  G.rewardGrade=Math.min(4,mapIndex);
  G.floor=_worldMapBaseFloor(mapIndex);
  G._mapNodeType=null;
  G._mapBattleCount=0;
  G._extraBattleMult=1.0;
  G.worldMap=_generateWorldMap();
  G.mapPosition=G.worldMap.startId;
  G.phase='map';
  _revealWorldMapAround(G.mapPosition);
  if(typeof clearLog==='function') clearLog();
  showScreen('battle');
  showWorldMap();
  log('マップを表示しました。ボスの場所と接続路が見えています。','sys');
}

function _worldMapBaseFloor(mapIndex){
  return Math.min(20,Math.max(1,(mapIndex-1)*5+1));
}
function _worldMapBossFloor(mapIndex){
  return Math.min(20,Math.max(5,mapIndex*5));
}
function _worldMapBattleFloor(nodeType){
  if(nodeType==='boss') return _worldMapBossFloor(G.mapIndex||1);
  const lo=_worldMapBaseFloor(G.mapIndex||1);
  const hi=Math.min(lo+3,19);
  if((G.mapIndex||1)===1&&(G._mapBattleCount||0)===1) return 1;
  return randi(Math.min(lo+1,hi),hi);
}
function _nodeId(x,y){ return `${x},${y}`; }
function _nodePos(id){ const [x,y]=id.split(',').map(Number); return {x,y}; }
function _nodeGridDist(a,b){
  const ap=_nodePos(a), bp=_nodePos(b);
  return Math.max(Math.abs(ap.x-bp.x),Math.abs(ap.y-bp.y));
}
function _worldMapAxisPct(v,max){ return max<=0?50:2+(v/max)*96; }
function _worldMapJitter(x,y,axis){
  const seed=((x+1)*73856093)^((y+1)*19349663)^(axis==='x'?83492791:2654435761);
  const n=Math.abs(Math.sin(seed)*10000)%1;
  return (n-.5)*(axis==='x'?2.0:3.0);
}
function _worldMapNodeLeft(x){ return Math.max(1,Math.min(99,_worldMapAxisPct(x,WORLD_MAP_W-1)+_worldMapJitter(x,0,'x'))); }
function _worldMapNodeTop(y){ return Math.max(1,Math.min(99,_worldMapAxisPct(y,WORLD_MAP_H-1)+_worldMapJitter(0,y,'y'))); }
function _worldMapEdgeKey(a,b){ return [a,b].sort().join('|'); }
function _worldMapNeighbors(id){
  const {x,y}=_nodePos(id);
  return WORLD_MAP_DIRS.map(([dx,dy])=>[x+dx,y+dy])
    .filter(([nx,ny])=>nx>=0&&nx<WORLD_MAP_W&&ny>=0&&ny<WORLD_MAP_H)
    .map(([nx,ny])=>_nodeId(nx,ny));
}
function _nodePathDistances(nodes,startId){
  const dist={[startId]:0};
  const q=[startId];
  while(q.length){
    const id=q.shift();
    (nodes[id]?.links||[]).forEach(to=>{
      if(dist[to]!==undefined) return;
      dist[to]=dist[id]+1;
      q.push(to);
    });
  }
  return dist;
}

function _generateWorldMap(){
  const startId=_nodeId(0,WORLD_MAP_H-1);
  const nodes={};
  for(let y=0;y<WORLD_MAP_H;y++){
    for(let x=0;x<WORLD_MAP_W;x++){
      const id=_nodeId(x,y);
      nodes[id]={id,x,y,type:'mob',links:[],cleared:false,seen:false};
    }
  }
  const wouldCrossDiagonal=(a,b)=>{
    const ap=_nodePos(a), bp=_nodePos(b);
    if(Math.abs(ap.x-bp.x)!==1||Math.abs(ap.y-bp.y)!==1) return false;
    const c=_nodeId(ap.x,bp.y);
    const d=_nodeId(bp.x,ap.y);
    return !!(nodes[c]?.links?.includes(d)||nodes[d]?.links?.includes(c));
  };
  const addLink=(a,b)=>{
    if(!nodes[a]||!nodes[b]||a===b) return false;
    if(wouldCrossDiagonal(a,b)) return false;
    if(!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if(!nodes[b].links.includes(a)) nodes[b].links.push(a);
    return true;
  };
  const visited=new Set([startId]);
  const frontier=_worldMapNeighbors(startId).filter(id=>nodes[id]).map(id=>({from:startId,to:id}));
  while(visited.size<Object.keys(nodes).length&&frontier.length){
    const edge=frontier.splice(Math.floor(Math.random()*frontier.length),1)[0];
    if(visited.has(edge.to)) continue;
    if(!addLink(edge.from,edge.to)) continue;
    visited.add(edge.to);
    _worldMapNeighbors(edge.to).forEach(n=>{ if(nodes[n]&&!visited.has(n)) frontier.push({from:edge.to,to:n}); });
  }
  Object.keys(nodes).forEach(id=>_worldMapNeighbors(id).forEach(n=>{
    if(nodes[n]&&id<n&&Math.random()<0.08) addLink(id,n);
  }));
  _worldMapNeighbors(startId).filter(id=>nodes[id]).forEach(id=>addLink(startId,id));

  const firstStepIds=_worldMapNeighbors(startId).filter(id=>nodes[startId].links.includes(id));
  firstStepIds.forEach(id=>{ nodes[id].type='mob'; });
  const reserved=new Set([startId,...firstStepIds]);
  nodes[startId].cleared=true;
  const allIds=Object.keys(nodes);
  const openIds=()=>allIds.filter(id=>!reserved.has(id));
  const dist=_nodePathDistances(nodes,startId);
  const bossCands=openIds().filter(id=>(dist[id]??0)>=6);
  const bossId=(bossCands.length?randFrom(bossCands):randFrom(openIds()));
  if(bossId){ nodes[bossId].type='boss'; reserved.add(bossId); }
  const canPlaceType=(id,type)=>{
    if(type==='mob'||type==='boss') return true;
    return !_worldMapNeighbors(id).some(n=>nodes[n]&&nodes[n].type===type);
  };
  const pickMany=(count,type)=>{
    for(let i=0;i<count;i++){
      let cands=openIds().filter(id=>canPlaceType(id,type));
      if(!cands.length) cands=openIds();
      if(!cands.length) return;
      const id=randFrom(cands);
      nodes[id].type=type;
      reserved.add(id);
    }
  };
  pickMany(5,'treasure');
  pickMany(5,'altar');
  pickMany(5,'shop');
  pickMany(5,'elite');
  return {w:WORLD_MAP_W,h:WORLD_MAP_H,startId,bossId,nodes,previewEdges:[],seenEdges:[]};
}

function _revealWorldMapAround(id){
  if(!G.worldMap||!id) return;
  const cur=G.worldMap.nodes[id];
  if(!cur) return;
  cur.seen=true;
  const nextIds=[];
  (cur.links||[]).forEach(to=>{
    const n=G.worldMap.nodes[to];
    if(!n) return;
    n.seen=true;
    nextIds.push(to);
  });
  const visibleEdges=new Set();
  Object.values(G.worldMap.nodes).forEach(n=>{
    if(!n.seen) return;
    (n.links||[]).forEach(to=>{
      if(G.worldMap.nodes[to]?.seen) visibleEdges.add(_worldMapEdgeKey(n.id,to));
    });
  });
  const previewEdges=new Set();
  nextIds.forEach(nodeId=>{
    const node=G.worldMap.nodes[nodeId];
    (node?.links||[]).forEach(to=>{
      if(to===id) return;
      if(!G.worldMap.nodes[to]?.seen) previewEdges.add(_worldMapEdgeKey(nodeId,to));
    });
  });
  G.worldMap.visibleEdges=[...visibleEdges];
  G.worldMap.previewEdges=[...previewEdges];
  const seenEdges=new Set(G.worldMap.seenEdges||[]);
  visibleEdges.forEach(k=>seenEdges.add(k));
  previewEdges.forEach(k=>seenEdges.add(k));
  G.worldMap.seenEdges=[...seenEdges];
}

function _revealBossRoute(){
  // ボス位置は隣接して見えるまで伏せる。
}

function showWorldMap(){
  G.phase='map';
  G.floor=_worldMapBaseFloor(G.mapIndex||1);
  _setWorldMapUI(true);
  if(typeof renderAll==='function') renderAll();
  _setWorldMapUI(true);
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  updateHUD();
  const panel=document.getElementById('world-map-panel');
  const grid=document.getElementById('world-map-grid');
  if(!panel||!grid||!G.worldMap) return;
  panel.hidden=false;
  grid.innerHTML='';
  const edgeLayer=document.createElement('div');
  edgeLayer.className='map-edge-layer';
  grid.appendChild(edgeLayer);
  const drawn=new Set();
  Object.values(G.worldMap.nodes).forEach(n=>{
    n.links.forEach(to=>{
      const t=G.worldMap.nodes[to];
      if(!t) return;
      const key=_worldMapEdgeKey(n.id,to);
      if(drawn.has(key)) return;
      const preview=(G.worldMap.previewEdges||[]).includes(key);
      const visible=(G.worldMap.visibleEdges||[]).includes(key);
      const seen=(G.worldMap.seenEdges||[]).includes(key);
      if(!visible&&!preview&&!seen) return;
      drawn.add(key);
      edgeLayer.appendChild(_makeWorldMapEdge(n,t,preview&&!visible));
    });
  });
  Object.values(G.worldMap.nodes).forEach(n=>{
    if(!n.seen) return;
    const btn=document.createElement('button');
    const movable=_isWorldMapAdjacentMove(n.id);
    btn.className=`map-node type-${n.type||'empty'}`;
    if(movable) btn.classList.add('is-moveable');
    if(n.id===G.mapPosition) btn.classList.add('is-current');
    if(n.type==='boss') btn.classList.add('boss-visible');
    if(n.cleared) btn.classList.add('is-cleared');
    btn.style.left=`${_worldMapNodeLeft(n.x)}%`;
    btn.style.top=`${_worldMapNodeTop(n.y)}%`;
    btn.style.backgroundImage=assetUrl(_worldMapNodeImage(n.id===G.mapPosition?'player':n.type));
    btn.textContent='';
    btn.title=n.id===G.mapPosition?'現在地':_worldMapLabel(n.type);
    btn.onclick=()=>{ if(movable) chooseWorldMapNode(n.id); else chooseWorldMapPath(n.id); };
    grid.appendChild(btn);
  });
  if(typeof renderMapInventory==='function') renderMapInventory();
}

function _makeWorldMapEdge(a,b,preview){
  const grid=document.getElementById('world-map-grid');
  const gridW=Math.max(1,grid?(grid.clientWidth||grid.offsetWidth):2142);
  const gridH=Math.max(1,grid?(grid.clientHeight||grid.offsetHeight):660);
  const ax=(_worldMapNodeLeft(a.x)/100)*gridW;
  const ay=(_worldMapNodeTop(a.y)/100)*gridH;
  const bx=(_worldMapNodeLeft(b.x)/100)*gridW;
  const by=(_worldMapNodeTop(b.y)/100)*gridH;
  const dx=bx-ax, dy=by-ay;
  const len=Math.sqrt(dx*dx+dy*dy);
  const safeLen=Math.max(len,0.0001);
  const ux=dx/safeLen, uy=dy/safeLen;
  const nodeRadius=n=>{
    if(n.id===G.mapPosition) return 38;
    if((n.type||'empty')==='empty') return n.id===G.mapPosition?38:13;
    return 30;
  };
  const sx=ax+ux*(nodeRadius(a)+5);
  const sy=ay+uy*(nodeRadius(a)+5);
  const ex=bx-ux*(nodeRadius(b)+5);
  const ey=by-uy*(nodeRadius(b)+5);
  const lx=ex-sx, ly=ey-sy;
  const lineLen=Math.max(0,Math.sqrt(lx*lx+ly*ly));
  const line=document.createElement('div');
  line.className='map-edge';
  line.style.left=`${sx}px`;
  line.style.top=`${sy}px`;
  line.style.width=`${lineLen}px`;
  line.style.transform=`translateY(-50%) rotate(${Math.atan2(ly,lx)}rad)`;
  if(Assets&&Assets.map&&Assets.map.dashedLine) line.style.backgroundImage=assetUrl(Assets.map.dashedLine);
  if(preview) line.classList.add('preview');
  return line;
}
function _isWorldMapAdjacentMove(id){
  const cur=G.worldMap?.nodes?.[G.mapPosition];
  return !!(cur&&cur.links&&cur.links.includes(id)&&_nodeGridDist(G.mapPosition,id)===1);
}
function _worldMapIcon(type){
  return {treasure:'宝',altar:'祈',event:'?',shop:'店',boss:'B',elite:'強',mob:'戦',empty:'・'}[type]||'・';
}
function _worldMapNodeImage(type){
  const m=Assets&&Assets.map?Assets.map:{};
  return m[type]||m.empty||'';
}
function _worldMapLabel(type){
  return {treasure:'宝',altar:'祭壇',event:'イベント',shop:'ショップ',boss:'ボス戦',elite:'エリート戦',mob:'戦闘',empty:'空白地'}[type]||type;
}

async function chooseWorldMapNode(id){
  if(!G.worldMap||!_isWorldMapAdjacentMove(id)) return;
  G.mapPosition=id;
  _revealWorldMapAround(id);
  showWorldMap();
  await sleep(260);
  if(!_consumeWorldMapTurn()) return;
  resolveWorldMapNode(G.worldMap.nodes[id]);
}

async function chooseWorldMapPath(id){
  const path=_findSafeWorldMapPath(id);
  if(!path||path.length<2) return;
  for(let p=1;p<path.length;p++){
    await chooseWorldMapNode(path[p]);
    if(G.phase!=='map') break;
  }
}

function _findSafeWorldMapPath(targetId){
  const map=G.worldMap;
  if(!map||!map.nodes?.[targetId]||!map.nodes[targetId].seen) return null;
  const start=G.mapPosition;
  const q=[start];
  const prev={[start]:null};
  while(q.length){
    const cur=q.shift();
    if(cur===targetId) break;
    (map.nodes[cur]?.links||[]).forEach(to=>{
      if(prev.hasOwnProperty(to)) return;
      const n=map.nodes[to];
      if(!n||!n.seen) return;
      if(to!==targetId&&(n.type||'empty')!=='empty') return;
      prev[to]=cur;
      q.push(to);
    });
  }
  if(!prev.hasOwnProperty(targetId)) return null;
  const path=[];
  for(let at=targetId;at!=null;at=prev[at]) path.push(at);
  return path.reverse();
}

function _consumeWorldMapTurn(){
  G.mapTurn=(G.mapTurn||1)+1;
  _tickLuckyEquipment();
  updateHUD();
  if(G.mapTurn>G.mapTurnLimit){
    gameOver();
    return false;
  }
  return true;
}

function _tickLuckyEquipment(){
  const holders=(G.allies||[]).filter(a=>a&&a.hp>0&&typeof unitHasEquip==='function'&&unitHasEquip(a,'equip_luck'));
  if(!holders.length) return;
  G._luckMapSteps=(G._luckMapSteps||0)+1;
  if(G._luckMapSteps<3) return;
  G._luckMapSteps=0;
  G.gold=(G.gold||0)+1;
  log('幸運の指輪：ゴールド+1','gold');
}

function resolveWorldMapNode(node){
  if(!node) return;
  if(node.cleared){
    node.type='empty';
    showWorldMap();
    return;
  }
  const type=node.type||'empty';
  if(['mob','elite','treasure','altar','event'].includes(type)){
    node.type='empty';
    node.cleared=true;
  }
  if(type==='empty'){
    log('空白地：何も起きなかった','sys');
    showWorldMap();
  } else if(type==='treasure'){
    log('宝：カードを1枚選べます','gold');
    showWorldMapPostBattleReward('宝');
  } else if(type==='altar'){
    const healed=_healAllAlliesHalf();
    log(`祭壇：味方を回復${healed?`（合計+${healed}）`:''}`,'good');
    showWorldMap();
  } else if(type==='event'){
    _applyWorldMapEventReward();
    showWorldMap();
  } else if(type==='shop'){
    log('ショップ：商人に会った','sys');
    _setWorldMapUI(false);
    doShop();
  } else {
    _startWorldMapBattle(type);
  }
}

function _healAllAlliesHalf(){
  let healed=0;
  (G.allies||[]).forEach(a=>{
    if(!a||a.hp<=0) return;
    const before=a.hp;
    a.hp=Math.min(a.maxHp||a.hp,a.hp+Math.ceil((a.maxHp||a.hp)/2));
    healed+=a.hp-before;
  });
  updateHUD();
  return healed;
}
function _applyWorldMapEventReward(){
  const k=randi(0,2);
  if(k===0){ G.actionsPerTurn=(G.actionsPerTurn||1)+1; log('イベント：行動数+1','good'); }
  else if(k===1){ if(typeof onMagicLevelUp==='function') onMagicLevelUp(1); else G.magicLevel=(G.magicLevel||1)+1; log('イベント：魔術LV+1','good'); }
  else { if(typeof onGoldGained==='function') onGoldGained(5); else G.gold=(G.gold||0)+5; log('イベント：ゴールド+5','good'); }
  updateHUD();
}

function _startWorldMapBattle(type){
  _setWorldMapUI(false);
  G._mapNodeType=type;
  G._mapBattleCount=(G._mapBattleCount||0)+1;
  G._extraBattleMult=type==='elite'?1.25:1.0;
  G.floor=_worldMapBattleFloor(type);
  log(`${_worldMapLabel(type)}に突入`,'bad');
  showScreen('battle');
  startBattle();
}

function showWorldMapPostBattleReward(label){
  G.phase='reward';
  _setWorldMapUI(false);
  const eArea=document.getElementById('enemy-area');
  const eHand=document.getElementById('enemy-hand-area');
  const reward=document.getElementById('reward-cards-section');
  const rw=document.getElementById('rw-cards');
  const info=document.getElementById('reward-info-bar');
  const pass=document.getElementById('btn-pass');
  const battleScreen=document.getElementById('scr-battle');
  if(battleScreen) battleScreen.classList.add('victory-reward-backdrop');
  if(eArea) eArea.style.display='none';
  if(eHand) eHand.style.display='none';
  if(info) info.style.display='none';
  if(pass) pass.style.display='none';
  if(reward) reward.style.display='';
  if(!rw) return;
  rw.innerHTML='';
  const picks=_drawWorldMapRewards();
  picks.forEach(card=>{
    const div=card&&card._isChar
      ?_mkWorldMapRewardUnitCard(card)
      :(typeof _mkRewDiv==='function')?_mkRewDiv(card,()=>_takeWorldMapReward(card),null):document.createElement('button');
    if(!(card&&card._isChar)) div.classList.add('map-choice-reward-card');
    if(!div.innerHTML) div.textContent=card.name;
    div.onclick=()=>_takeWorldMapReward(card);
    rw.appendChild(div);
  });
  log(`${label||'戦闘報酬'}：1つ選んで獲得`,'gold');
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  if(typeof renderHandEditor==='function') renderHandEditor();
  updateHUD();
}

function _mkWorldMapRewardUnitCard(card){
  const slot=document.createElement('div');
  slot.className='slot is-rear unit-card map-reward-unit';
  if(typeof applyUnitVisual==='function') applyUnitVisual(slot,card);
  const gradeTag=card.grade?`<div class="slot-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(card.grade):gradeStr(card.grade)}</div>`:'';
  const desc=card.desc&&typeof computeDesc==='function'?computeDesc(card):'';
  if(desc) slot.setAttribute('data-preview',desc.replace(/<[^>]+>/g,''));
  slot.innerHTML=`${gradeTag}<div class="unit-portrait"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none"><div class="slot-name">${card.name}</div><div class="slot-race">${card.race||'-'}</div><div class="slot-stats"><span class="a">${card.atk}</span><span class="s">/</span><span class="h">${card.hp}</span></div></div>`;
  slot.style.cursor='pointer';
  return slot;
}

function _drawWorldMapRewards(){
  const grade=G.rewardGrade||1;
  const choices=[], used=new Set();
  const add=card=>{
    if(!card||used.has(card.id)||choices.length>=3) return;
    card._buyPrice=0;
    used.add(card.id);
    choices.push(card);
  };
  add(typeof drawEquipment==='function'?drawEquipment(1,grade)[0]:null);
  add(typeof drawTreasure==='function'?drawTreasure({1:70,2:25,3:5},{wand:100,consumable:0,ring:0},grade):null);
  add(typeof drawTreasure==='function'?drawTreasure({1:70,2:25,3:5},{wand:0,consumable:100,ring:0},grade):null);
  let guard=0;
  while(choices.length<3&&guard++<40){
    add(typeof drawTreasure==='function'?drawTreasure({1:70,2:25,3:5},{wand:35,consumable:35,ring:30},grade):null);
  }
  return choices;
}

function _takeWorldMapReward(card){
  if(!card) return;
  const ov=document.getElementById('victory-overlay');
  if(ov) ov.style.display='none';
  document.body.classList.remove('victory-reward-active');
  const battleScreen=document.getElementById('scr-battle');
  if(battleScreen) battleScreen.classList.remove('victory-reward-backdrop');
  if(card._isChar){
    const slot=G.allies.findIndex(a=>!a||a.hp<=0);
    if(slot<0){ log('盤面が満杯です','bad'); return; }
    G.allies[slot]=makeUnitFromDef(card,undefined,true);
    log(`${card.name}を獲得（味方に配置）`,'good');
  } else {
    takeCardToHand(card);
    log(`${card.name}を獲得`,'good');
  }
  if(typeof completeWorldMapBattle==='function') completeWorldMapBattle();
}

function completeWorldMapBattle(){
  const type=G._mapNodeType;
  G._mapNodeType=null;
  if(type==='boss'){
    if((G.mapIndex||1)>=4){ showScreen('clear'); return; }
    initWorldMap((G.mapIndex||1)+1);
    return;
  }
  showWorldMap();
}

function _setWorldMapUI(isMap){
  document.body.classList.toggle('world-map-active',!!isMap);
  if(!isMap) G.inventoryOpen=false;
  const panel=document.getElementById('world-map-panel');
  if(panel) panel.hidden=!isMap;
  const invPanel=document.getElementById('map-inventory-panel');
  if(invPanel) invPanel.hidden=true;
  const invBtn=document.getElementById('map-inventory-toggle');
  if(invBtn) invBtn.style.display=isMap?'':'none';
  const enemyArea=document.getElementById('enemy-area');
  if(enemyArea) enemyArea.style.display=isMap?'none':'';
  const enemyHand=document.getElementById('enemy-hand-area');
  if(enemyHand) enemyHand.style.display=isMap?'none':'';
  const reward=document.getElementById('reward-cards-section');
  if(reward) reward.style.display='none';
  const info=document.getElementById('reward-info-bar');
  if(info) info.style.display='none';
  const moveBtns=document.getElementById('reward-move-btns');
  if(moveBtns) moveBtns.style.display='none';
  const pass=document.getElementById('btn-pass');
  if(pass) pass.style.display=isMap?'none':'';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display='';
  const ally=document.getElementById('ally-section');
  if(ally) ally.style.display='';
  if(typeof renderMapInventory==='function') renderMapInventory();
}
