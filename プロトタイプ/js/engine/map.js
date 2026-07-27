// ═══════════════════════════════════════
// map.js — 7x7ワールドマップ進行
// 依存: state.js, floors.js, pool.js, enemy.js, reward.js
// ═══════════════════════════════════════

const WORLD_MAP_ENABLED=true;
const WORLD_MAP_SIZE=7;
const WORLD_MAP_MAX_INDEX=4;
const WORLD_MAP_BASE_TURN_LIMIT=15;
const WORLD_MAP_CENTER=3*WORLD_MAP_SIZE+3;
const MAP_PANEL_POWERS=[
  {id:'summon',name:'召喚の力',price:200,desc:'置いたカードがキャラクターなら開戦時に場に出る。'},
  {id:'life',name:'生命の力',price:400,desc:'置いたカードがキャラクターならステータスを2倍にし、開戦時に場に出る。'},
  {id:'eternal',name:'永劫の力',price:600,desc:'置いたカードがキャラクターなら永久に+5/+5してから場に出る。'},
  {id:'resonance',name:'共鳴の力',price:800,desc:'置いたカードがキャラクターなら、それは強化としても扱い、開戦時に場に出る。'},
  {id:'duplicate',name:'複製の力',price:1000,desc:'置いたカードがキャラクターなら、開戦時に場に出てコピーを1体生成する。'},
];
window.MAP_PANEL_POWERS=MAP_PANEL_POWERS;

function _applyMapPanelPowerSheetRows(){
  const rows=Array.isArray(window.MAP_PANEL_POWER_SHEET_ROWS)?window.MAP_PANEL_POWER_SHEET_ROWS:[];
  if(!rows.length) return;
  const idByNo={M001:'summon',M002:'life',M003:'eternal',M004:'resonance',M005:'duplicate'};
  const idByName=Object.fromEntries(MAP_PANEL_POWERS.map(p=>[p.name,p.id]));
  rows.forEach(row=>{
    if(!row) return;
    const name=String(row['名前']||row['カード名']||'').trim();
    const no=String(row['No.']||row['No']||row['NO']||'').trim();
    const id=idByNo[no]||idByName[name];
    const target=MAP_PANEL_POWERS.find(p=>p.id===id);
    if(!target) return;
    if(name) target.name=name;
    const priceRaw=String(row['価格']||'').replace(/,/g,'').trim();
    const price=parseInt(priceRaw,10);
    if(priceRaw&&!isNaN(price)) target.price=price;
    const desc=String(row['効果']||row['説明']||row['説明文']||'').trim();
    if(desc) target.desc=desc;
  });
}
_applyMapPanelPowerSheetRows();

function _mapKey(x,y){ return `${x},${y}`; }
function _mapIdx(x,y){ return y*WORLD_MAP_SIZE+x; }
function _mapXY(idx){ return {x:idx%WORLD_MAP_SIZE,y:Math.floor(idx/WORLD_MAP_SIZE)}; }
function _mapNeighbors(idx){
  const {x,y}=_mapXY(idx);
  return [[x,y-1],[x+1,y],[x,y+1],[x-1,y]]
    .filter(([nx,ny])=>nx>=0&&ny>=0&&nx<WORLD_MAP_SIZE&&ny<WORLD_MAP_SIZE)
    .map(([nx,ny])=>_mapIdx(nx,ny));
}
function _mapNeighborsWide(idx){
  const {x,y}=_mapXY(idx);
  return [
    [x,y-1],[x+1,y-1],[x+1,y],[x+1,y+1],
    [x,y+1],[x-1,y+1],[x-1,y],[x-1,y-1],
  ]
    .filter(([nx,ny])=>nx>=0&&ny>=0&&nx<WORLD_MAP_SIZE&&ny<WORLD_MAP_SIZE)
    .map(([nx,ny])=>_mapIdx(nx,ny));
}
function _mapEdgeKey(a,b){ return a<b?`${a}-${b}`:`${b}-${a}`; }
function _markMapEdgeRevealed(a,b){
  const m=G&&G.worldMap;
  if(!m||a==null||b==null) return;
  m.revealedEdges=m.revealedEdges||{};
  m.revealedEdges[_mapEdgeKey(a,b)]=true;
}
function _mapEdgesWouldCrossDiagonal(from,to,edges){
  const a=_mapXY(from), b=_mapXY(to);
  if(Math.abs(a.x-b.x)!==1||Math.abs(a.y-b.y)!==1) return false;
  const c=_mapIdx(a.x,b.y);
  const d=_mapIdx(b.x,a.y);
  const crossKey=_mapEdgeKey(c,d);
  return (edges||[]).some(e=>_mapEdgeKey(e[0],e[1])===crossKey);
}
function _mapVisualPointFor(id){
  const {x,y}=_mapXY(id);
  const marginX=9, marginY=11;
  const stepX=(100-marginX*2)/(WORLD_MAP_SIZE-1);
  const stepY=(100-marginY*2)/(WORLD_MAP_SIZE-1);
  const rawX=marginX+x*stepX;
  const rawY=marginY+y*stepY;
  return {
    x,
    y,
    px:Math.max(22,Math.min(78,50+(rawX-50)*0.54+(Math.random()-.5)*7.5)),
    py:Math.max(20,Math.min(80,50+(rawY-50)*0.54+(Math.random()-.5)*6.5)),
  };
}
function _mapAngleBetween(a,b){
  let d=Math.abs(a-b);
  if(d>Math.PI) d=Math.PI*2-d;
  return d;
}
function _mapEdgeAngleOk(from,to,edges,pointFor,minDeg){
  const minRad=(minDeg||30)*Math.PI/180;
  const base=pointFor(from);
  const target=pointFor(to);
  const nextAngle=Math.atan2(target.py-base.py,target.px-base.px);
  return !(edges||[]).some(e=>{
    if(e[0]!==from&&e[1]!==from) return false;
    const other=pointFor(e[0]===from?e[1]:e[0]);
    const angle=Math.atan2(other.py-base.py,other.px-base.px);
    return _mapAngleBetween(nextAngle,angle)<minRad;
  });
}
function _mapEdgeNeighbors(id,edges){
  const out=[];
  (edges||[]).forEach(e=>{
    if(e[0]===id) out.push(e[1]);
    else if(e[1]===id) out.push(e[0]);
  });
  return out;
}
function _isMapEdgeCell(node){
  return !!node&&(node.x===0||node.y===0||node.x===WORLD_MAP_SIZE-1||node.y===WORLD_MAP_SIZE-1);
}
function _mapDelay(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}
function _mapPathBetween(startId,targetId){
  const m=G&&G.worldMap;
  if(!m||startId==null||targetId==null) return [];
  if(startId===targetId) return [startId];
  const exists=new Set((m.nodes||[]).map(n=>n&&n.id).filter(id=>id!=null));
  if(!exists.has(startId)||!exists.has(targetId)) return [];
  const prev=new Map([[startId,null]]);
  const q=[startId];
  while(q.length){
    const id=q.shift();
    for(const nb of _mapEdgeNeighbors(id,m.edges)){
      if(!exists.has(nb)||prev.has(nb)) continue;
      prev.set(nb,id);
      if(nb===targetId){
        const path=[targetId];
        let cur=targetId;
        while(prev.get(cur)!=null){
          cur=prev.get(cur);
          path.push(cur);
        }
        return path.reverse();
      }
      q.push(nb);
    }
  }
  return [];
}
function _mapGraphDistance(a,b){
  const path=_mapPathBetween(a,b);
  return path.length?path.length-1:999;
}
function _mapGridDistance(a,b){
  if(!a||!b) return 999;
  return Math.abs((a.x||0)-(b.x||0))+Math.abs((a.y||0)-(b.y||0));
}
function _mapIsAdjacentCell(a,b){
  if(!a||!b||a===b) return false;
  return Math.max(Math.abs((a.x||0)-(b.x||0)),Math.abs((a.y||0)-(b.y||0)))<=1;
}
const _MAP_NON_BATTLE_TYPES=new Set(['empty','elite','boss','village','event','treasure']);
const _MAP_SPACED_SAME_TYPES=new Set(['village','elite','treasure']);
function _canAssignMapNodeType(node,type,nodes){
  if(!node||type==='battle'||type==='start') return true;
  if(type==='elite'&&(Number(node.dist)||0)<4) return false;
  if(_MAP_NON_BATTLE_TYPES.has(type)){
    const adjacentNonBattle=(nodes||[]).some(n=>n&&n!==node&&_MAP_NON_BATTLE_TYPES.has(n.type)&&_mapIsAdjacentCell(node,n));
    if(adjacentNonBattle) return false;
  }
  if(_MAP_SPACED_SAME_TYPES.has(type)){
    const sameTooClose=(nodes||[]).some(n=>n&&n!==node&&n.type===type&&_mapGridDistance(node,n)<3);
    if(sameTooClose) return false;
  }
  return true;
}
function _weightedMapNodeTypes(){
  return ['battle','battle','battle','village','event','event','treasure','empty','empty','empty'];
}
function getWorldMapStageBackgroundKey(){
  if(!G||!G.worldMapRun) return null;
  return ['stage1','stage2','stage3','stage4'][Math.max(0,Math.min(3,(G.worldMapRun.index||1)-1))];
}
function _mapNodeById(id){
  const m=G&&G.worldMap;
  return m&&Array.isArray(m.nodes)?m.nodes.find(n=>n&&n.id===id):null;
}
function _mapCurrentNode(){ return _mapNodeById(G.worldMap&&G.worldMap.current); }
function _mapCurrentVillageNode(){
  const node=_mapCurrentNode();
  return node&&node.type==='village'?node:null;
}
function _mapDistanceFromStart(id){
  const n=_mapNodeById(id);
  return n&&Number.isFinite(n.dist)?n.dist:0;
}
function _mapDeepLevelsPerMap(){
  const fromFloor=Number(FLOOR_DATA&&FLOOR_DATA._deepLevelsPerMap);
  if(Number.isFinite(fromFloor)&&fromFloor>0) return fromFloor;
  const table=(typeof window!=='undefined'&&window.MAP_DEEP_LEVEL_DATA)||null;
  const levels=table?Object.values(table).flatMap(v=>Object.keys(v||{}).map(n=>parseInt(n,10)).filter(Number.isFinite)):[];
  return Math.max(1,...levels,6);
}
function _mapDeepLevel(id){
  const maxDeep=_mapDeepLevelsPerMap();
  const dist=Math.max(1,_mapDistanceFromStart(id));
  return Math.max(1,Math.min(maxDeep,dist));
}
function _mapEffectiveFloor(id,deepOverride){
  const mapNo=Math.max(1,G.worldMap?.index||1);
  const maxDeep=_mapDeepLevelsPerMap();
  const deep=Number.isFinite(deepOverride)?Math.max(1,Math.min(maxDeep,deepOverride)):_mapDeepLevel(id);
  return Math.max(1,(mapNo-1)*maxDeep+deep);
}
function _newMapNode(id,point){
  const p=point||_mapVisualPointFor(id);
  const {x,y}=p;
  return {
    id,x,y,type:'battle',cleared:false,visible:false,visited:false,dist:0,
    px:p.px,
    py:p.py,
  };
}
function _computeMapDistances(nodes,startId,edges){
  const by=new Map(nodes.map(n=>[n.id,n]));
  nodes.forEach(n=>{ n.dist=999; });
  const start=by.get(startId);
  if(!start) return;
  start.dist=0;
  const q=[startId];
  while(q.length){
    const id=q.shift();
    const cur=by.get(id);
    _mapEdgeNeighbors(id,edges).forEach(nb=>{
      const n=by.get(nb);
      if(!n||n.dist<=cur.dist+1) return;
      n.dist=cur.dist+1;
      q.push(nb);
    });
  }
}
function _revealAroundCurrentMapNode(){
  const m=G.worldMap;
  if(!m) return;
  const node=_mapCurrentNode();
  if(!node) return;
  const visible=new Set([node.id,..._mapEdgeNeighbors(node.id,m.edges)]);
  m.nodes.forEach(n=>{
    if(visible.has(n.id)){
      n.visible=true;
      m.revealed[n.id]=true;
    } else if(m.revealed[n.id]){
      n.visible=true;
    }
  });
}
function generateWorldMap(index){
  const target=randi(36,40);
  const picked=new Set([WORLD_MAP_CENTER]);
  const edges=[];
  const pointCache=new Map();
  const pointFor=id=>{
    if(!pointCache.has(id)) pointCache.set(id,_mapVisualPointFor(id));
    return pointCache.get(id);
  };
  while(picked.size<target){
    const frontier=[];
    picked.forEach(id=>_mapNeighborsWide(id).forEach(nb=>{
      if(!picked.has(nb)&&!_mapEdgesWouldCrossDiagonal(id,nb,edges)&&_mapEdgeAngleOk(id,nb,edges,pointFor,30)) frontier.push({from:id,to:nb});
    }));
    if(!frontier.length) break;
    const next=randFrom(frontier);
    picked.add(next.to);
    edges.push([next.from,next.to]);
  }
  const nodes=[...picked].map(id=>_newMapNode(id,pointFor(id)));
  _computeMapDistances(nodes,WORLD_MAP_CENTER,edges);
  let bossCandidates=nodes.filter(n=>n.id!==WORLD_MAP_CENTER&&n.dist>=4);
  if(!bossCandidates.length) bossCandidates=nodes.filter(n=>n.id!==WORLD_MAP_CENTER);
  const boss=randFrom(bossCandidates.sort((a,b)=>b.dist-a.dist).slice(0,8));
  nodes.forEach(n=>{
    if(n.id===WORLD_MAP_CENTER){ n.type='start'; n.visited=true; n.cleared=true; return; }
    n.type='battle';
  });
  if(boss&&_canAssignMapNodeType(boss,'boss',nodes)) boss.type='boss';
  else if(boss) boss.type='boss';
  const assignTargets=nodes
    .filter(n=>n.id!==WORLD_MAP_CENTER&&n!==boss)
    .sort(()=>Math.random()-.5);
  assignTargets.forEach(n=>{
    const pool=_weightedMapNodeTypes().sort(()=>Math.random()-.5);
    const picked=pool.find(t=>!(_isMapEdgeCell(n)&&t==='empty')&&_canAssignMapNodeType(n,t,nodes));
    n.type=picked||'battle';
  });
  {
    const elites=nodes.filter(n=>n.type==='elite').sort(()=>Math.random()-.5);
    elites.forEach((n,i)=>{ n._eliteMoveClock=i<Math.ceil(elites.length/2)?1:0; });
  }
  const m={
    index:index||1,
    turn:0,
    turnLimit:WORLD_MAP_BASE_TURN_LIMIT,
    current:WORLD_MAP_CENTER,
    nodes,
    revealed:{[WORLD_MAP_CENTER]:true},
    revealedEdges:{},
    forcedBoss:false,
    zoom:1.8,
    edges,
  };
  G.worldMap=m;
  _revealAroundCurrentMapNode();
  return m;
}
function startWorldMapRun(){
  G.worldMapRun={index:1,max:WORLD_MAP_MAX_INDEX,usedBossEnemyNames:[]};
  generateWorldMap(1);
}
function _ensureWorldMap(){
  if(!G.worldMapRun) startWorldMapRun();
  if(!G.worldMap) generateWorldMap(G.worldMapRun.index||1);
}
function goToWorldMap(){
  _ensureWorldMap();
  G.phase='map';
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isTreasureMapReward=false;
  G._mapReturnAfterReward=false;
  G._pendingMapForgePower=null;
  document.body.classList.remove('reward-screen-active','battle-turn-active');
  document.body.classList.remove('treasure-offer-phase');
  document.body.classList.add('world-map-active');
  document.body.classList.add('world-map-render-pending');
  const villageExtra=document.getElementById('map-village-extra-btn');
  if(villageExtra) villageExtra.style.setProperty('display','none','important');
  showScreen('battle');
  if(typeof playBgm==='function') playBgm('menu',{fadeInMs:700});
  renderWorldMap();
  setTimeout(()=>document.body.classList.remove('world-map-render-pending'),140);
  updateHUD();
}
function renderWorldMap(){
  const panel=document.getElementById('world-map-panel');
  const grid=document.getElementById('world-map-grid');
  if(!panel||!grid||!G.worldMap) return;
  panel.hidden=false;
  grid.innerHTML='';
  grid.style.transform=`scale(${G.worldMap.zoom||1})`;
  grid.style.transformOrigin='50% 50%';
  if(!grid._wheelWired){
    grid._wheelWired=true;
    panel.addEventListener('wheel',e=>{
      if(G.phase!=='map') return;
      e.preventDefault();
      G.worldMap.zoom=Math.max(1,Math.min(1.8,(G.worldMap.zoom||1)+(e.deltaY<0?.08:-.08)));
      renderWorldMap();
    },{passive:false});
  }
  const by=new Map(G.worldMap.nodes.map(n=>[n.id,n]));
  const edgeLayer=document.createElement('div');
  edgeLayer.className='map-edge-layer';
  const gridW=grid.clientWidth||grid.offsetWidth||3840;
  const gridH=grid.clientHeight||grid.offsetHeight||2160;
  const currentNode=_mapCurrentNode();
  const roadDepth=new Map();
  if(currentNode){
    roadDepth.set(currentNode.id,0);
    _mapEdgeNeighbors(currentNode.id,G.worldMap.edges).forEach(id=>roadDepth.set(id,1));
    [...roadDepth.entries()].forEach(([id,d])=>{
      if(d>=1) return;
      _mapEdgeNeighbors(id,G.worldMap.edges).forEach(nb=>{
        if(!roadDepth.has(nb)) roadDepth.set(nb,d+1);
      });
    });
  }
  (G.worldMap.edges||[]).forEach(pair=>{
      const n=by.get(pair[0]);
      const m=by.get(pair[1]);
      if(!n||!m) return;
      const bothVisible=n.visible&&m.visible;
      const peekingRoad=(roadDepth.get(n.id)<=1)||(roadDepth.get(m.id)<=1);
      const edgeKey=_mapEdgeKey(n.id,m.id);
      const edgeRevealed=!!(G.worldMap.revealedEdges&&G.worldMap.revealedEdges[edgeKey]);
      if(!bothVisible&&!peekingRoad&&!edgeRevealed) return;
      if(bothVisible||peekingRoad) _markMapEdgeRevealed(n.id,m.id);
      const edge=document.createElement('div');
      edge.className=`map-edge${bothVisible?'':' preview'}${edgeRevealed&&!bothVisible&&!peekingRoad?' remembered':''}`;
      const x1=n.px*gridW/100,y1=n.py*gridH/100,x2=m.px*gridW/100,y2=m.py*gridH/100;
      const dx=x2-x1,dy=y2-y1;
      edge.style.left=`${x1}px`;
      edge.style.top=`${y1}px`;
      edge.style.width=`${Math.hypot(dx,dy)}px`;
      edge.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
      edge.style.backgroundImage=`url("${Assets.map.dashedLine}")`;
      edgeLayer.appendChild(edge);
  });
  grid.appendChild(edgeLayer);
  const current=G.worldMap.current;
  const selectable=new Set(G.worldMap.nodes
    .filter(n=>n&&n.visible&&n.id!==current&&_mapPathBetween(current,n.id).length>1)
    .map(n=>n.id));
  G.worldMap.nodes.forEach(n=>{
    if(!n.visible) return;
    const btn=document.createElement('button');
    const type=n.id===current?'player':(n.cleared&&n.type!=='village'&&n.type!=='boss'?'empty':n.type);
    btn.className=`map-node type-${n.type}`;
    btn.style.left=`${n.px}%`;
    btn.style.top=`${n.py}%`;
    btn.style.backgroundImage=`url("${_mapNodeIcon(type)}")`;
    if(n.id===current) btn.classList.add('is-current');
    if(selectable.has(n.id)) btn.classList.add('is-moveable');
    if(n.type==='boss') btn.classList.add('boss-visible');
    btn.title=_mapNodeTitle(n);
    const preview=_mapEnemyPreview(n);
    if(preview) btn.setAttribute('data-preview',preview);
    btn.onclick=()=>{
      if(G._pendingMapItemUse&&handlePendingMapItemNode(n.id)) return;
      if(n.id===current&&n.type==='village') openMapVillage();
      else if(selectable.has(n.id)) moveToMapNode(n.id);
    };
    grid.appendChild(btn);
  });
  _renderMapHud(panel);
}
function _mapNodeIcon(type){
  if(type==='player') return Assets.map.player;
  if(type==='battle') return Assets.map.mob;
  if(type==='elite') return Assets.map.elite;
  if(type==='boss') return Assets.map.boss;
  if(type==='village') return Assets.map.shop;
  if(type==='event') return Assets.map.event;
  if(type==='treasure') return Assets.map.treasure;
  return Assets.map.empty;
}
function _mapNodeTitle(n){
  const names={start:'開始地点',battle:'通常戦闘',elite:'エリート',boss:'ボス',village:'村',event:'イベント',treasure:'宝箱'};
  return `${names[n.type]||n.type} / 距離${n.dist}`;
}
function _mapEnemyPowerRating(node){
  if(!node) return 1;
  const fixedDeep=node.type==='elite'?4:(node.type==='boss'?5:null);
  const floor=_mapEffectiveFloor(node.id,fixedDeep);
  const fd=FLOOR_DATA[floor]||{mult:1};
  const typeMult=node.type==='boss'?1.5:1;
  const eliteMult=node.type==='elite'?1.2*Math.max(1,Number(node._elitePowerMult)||1):1;
  const forced=node._forcedBoss?2:1;
  const meteor=Math.max(0.1,Number(node._meteorDebuff)||1);
  return (fd.mult||1)*_mapTurnStrengthMult()*typeMult*eliteMult*forced*meteor;
}
function _mapEnemyStars(node){
  if(!node||!['battle','elite','boss'].includes(node.type)) return '';
  const rel=Math.min(1,_mapEnemyPowerRating(node)/(5*1.5*(1+(WORLD_MAP_BASE_TURN_LIMIT||15)*0.5)));
  const stars=Math.max(1,Math.min(10,Math.ceil(rel*10)));
  return '★'.repeat(stars);
}
function _mapEnemyPreview(node){
  const names={battle:'通常戦闘',elite:'エリート',boss:'ボス'};
  if(!node||!names[node.type]) return '';
  return `${names[node.type]}\n強さ：${_mapEnemyStars(node)}\n距離${node.dist}`;
}
function _renderMapHud(panel){
  let hud=document.getElementById('world-map-hud');
  if(!hud){
    hud=document.createElement('div');
    hud.id='world-map-hud';
    panel.appendChild(hud);
  }
  const m=G.worldMap;
  hud.innerHTML=`<div>ターン ${m.turn}/${m.turnLimit||WORLD_MAP_BASE_TURN_LIMIT}</div><button type="button" class="btn small" id="map-open-board-btn">編成</button>`;
  const btn=hud.querySelector('#map-open-board-btn');
  if(btn) btn.onclick=()=>openMapFormation();
}
function _consumePendingMapItemUse(){
  const pending=G._pendingMapItemUse;
  if(!pending) return;
  if(Array.isArray(G.spellSlots)&&Number.isInteger(pending.slotIdx)) G.spellSlots[pending.slotIdx]=null;
  G._pendingMapItemUse=null;
}
function handlePendingMapItemNode(nodeId){
  const pending=G._pendingMapItemUse;
  const node=_mapNodeById(nodeId);
  if(!pending||!node||!node.visible) return false;
  if(pending.key==='portal_scroll'){
    G.worldMap.current=node.id;
    node.visited=true;
    _consumePendingMapItemUse();
    _revealAroundCurrentMapNode();
    log('ポータルの巻物でワープした。','gold');
    renderWorldMap();
    updateHUD();
    return true;
  }
  if(pending.key==='meteor_scroll'){
    if(['battle','elite','boss'].includes(node.type)){
      node._meteorDebuff=(Number(node._meteorDebuff)||1)*0.5;
      log('隕石の巻物で敵戦力を半減させた。','gold');
    }else if(node.id!==G.worldMap.current){
      node.type='empty';
      node.cleared=true;
      log('隕石の巻物でマスを空白にした。','gold');
    }
    _consumePendingMapItemUse();
    renderWorldMap();
    updateHUD();
    return true;
  }
  return false;
}
function warpToNearestVillage(){
  const m=G.worldMap;
  if(!m) return false;
  const villages=(m.nodes||[]).filter(n=>n&&n.type==='village');
  if(!villages.length) return false;
  const cur=m.current;
  villages.sort((a,b)=>_mapGraphDistance(cur,a.id)-_mapGraphDistance(cur,b.id));
  const target=villages[0];
  if(!target) return false;
  m.current=target.id;
  target.visited=true;
  _revealAroundCurrentMapNode();
  log('幻視の巻物で最も近い村へワープした。','gold');
  goToWorldMap();
  return true;
}
function _elitePriorityTarget(node){
  const m=G.worldMap;
  if(!m||!node) return null;
  const targets=[];
  const player=_mapNodeById(m.current);
  if(player) targets.push({node:player,priority:0});
  (m.nodes||[]).forEach(n=>{
    if(!n||n===node) return;
    if(n.type==='village'||n.type==='treasure') targets.push({node:n,priority:1});
  });
  const near=targets
    .map(t=>({...t,dist:_mapGraphDistance(node.id,t.node.id)}))
    .filter(t=>t.dist>0&&t.dist<=2)
    .sort((a,b)=>a.dist-b.dist||a.priority-b.priority);
  if(!near.length) return null;
  const bestDist=near[0].dist;
  const bestPri=near[0].priority;
  const best=near.filter(t=>t.dist===bestDist&&t.priority===bestPri);
  return randFrom(best).node;
}
function _eliteNextNode(node){
  const m=G.worldMap;
  if(!m||!node) return null;
  const target=_elitePriorityTarget(node);
  if(target){
    const path=_mapPathBetween(node.id,target.id);
    if(path.length>1){
      const step=_mapNodeById(path[1]);
      if(step&&step.type!=='boss'&&step.type!=='elite') return step;
    }
  }
  const candidates=_mapEdgeNeighbors(node.id,m.edges)
    .map(_mapNodeById)
    .filter(to=>to&&to.type!=='boss'&&to.type!=='elite');
  return candidates.length?randFrom(candidates):null;
}
function _moveMapElites(){
  const m=G.worldMap;
  if(!m) return null;
  const elites=(m.nodes||[]).filter(n=>n&&n.type==='elite');
  let encounter=null;
  elites.forEach(n=>{
    if(n.type!=='elite') return;
    n._eliteMoveClock=(n._eliteMoveClock||0)+1;
    if(n._eliteMoveClock<2) return;
    n._eliteMoveClock=0;
    const to=_eliteNextNode(n);
    if(!to) return;
    const bonus=(Number(n._elitePowerMult)||1)*(to.type==='village'||to.type==='treasure'?1.2:1);
    n.type='empty';
    n.cleared=true;
    delete n._eliteMoveClock;
    delete n._elitePowerMult;
    to.type='elite';
    to.cleared=false;
    to._eliteMoveClock=0;
    to._elitePowerMult=bonus;
    if(to.id===m.current) encounter=to;
  });
  return encounter;
}
function _spawnUnknownElite(){
  const m=G.worldMap;
  if(!m||!m.turn||m.turn%3!==0) return false;
  const candidates=(m.nodes||[]).filter(n=>n&&n.id!==m.current&&['battle','empty','event'].includes(n.type)&&!m.revealed[n.id]);
  if(!candidates.length) return false;
  const n=randFrom(candidates);
  n.type='elite';
  n.cleared=false;
  n._eliteMoveClock=0;
  n._elitePowerMult=1;
  return true;
}
function _mapTurnStrengthMult(){
  const m=G.worldMap;
  const turn=Math.max(0,Number(m&&m.turn)||0);
  return 1+turn*.5;
}
async function _moveToAdjacentMapNode(id,options){
  const m=G.worldMap;
  if(!m||!_mapNodeById(id)) return false;
  if(!_mapEdgeNeighbors(m.current,m.edges).includes(id)) return false;
  if((m.turn||0)>=m.turnLimit){
    m.turn=m.turnLimit;
    startMapBattle('boss',m.current,true);
    return true;
  }
  m.current=id;
  m.turn++;
  const node=_mapNodeById(id);
  node.visited=true;
  _revealAroundCurrentMapNode();
  renderWorldMap();
  updateHUD();
  await _mapDelay(options&&options.fast?120:260);
  if(node.id===m.current&&node.type==='elite'){
    startMapBattle('elite',id,false);
    return true;
  }
  if(node.cleared&&node.type!=='village'&&node.type!=='boss'){
    renderWorldMap();
    return false;
  }
  if(node.type==='battle'||node.type==='elite'||node.type==='boss'){
    startMapBattle(node.type,id,false);
    return true;
  } else if(node.type==='village'){
    if(options&&options.passThrough) renderWorldMap();
    else enterVillageNode(node);
    return !(options&&options.passThrough);
  } else if(node.type==='event'){
    resolveMapEvent(node);
    return true;
  } else if(node.type==='treasure'){
    enterTreasureNode(node);
    return true;
  } else {
    if(!(options&&options.deferEliteMove)){
      _spawnUnknownElite();
      const encounter=_moveMapElites();
      _revealAroundCurrentMapNode();
      if(encounter){
        startMapBattle('elite',encounter.id,false);
        return true;
      }
    }
    renderWorldMap();
    return false;
  }
}
async function moveToMapNode(id){
  const m=G.worldMap;
  if(!m||!_mapNodeById(id)||id===m.current||G._mapAutoMoving) return;
  const path=_mapPathBetween(m.current,id);
  if(path.length<2) return;
  G._mapAutoMoving=true;
  try{
    for(let i=1;i<path.length;i++){
      if(G.phase!=='map'||!G.worldMap) break;
      const stepId=path[i];
      const isFinal=i===path.length-1;
      const stepNode=_mapNodeById(stepId);
      const stopped=await _moveToAdjacentMapNode(stepId,{passThrough:!isFinal&&stepNode&&stepNode.type==='village',fast:path.length>2,deferEliteMove:true});
      if(stopped||G.phase!=='map') break;
    }
  }finally{
    G._mapAutoMoving=false;
  }
  if(G.phase==='map'&&G.worldMap){
    _spawnUnknownElite();
    const encounter=_moveMapElites();
    _revealAroundCurrentMapNode();
    if(encounter) startMapBattle('elite',encounter.id,false);
    else renderWorldMap();
  }
}
function startMapBattle(type,nodeId,forced){
  const m=G.worldMap;
  const node=_mapNodeById(nodeId);
  const fixedDeep=type==='elite'?4:(type==='boss'?5:null);
  const floor=_mapEffectiveFloor(nodeId||m.current,fixedDeep);
  m.battleCount=(m.battleCount||0)+1;
  const elitePowerMult=type==='elite'?1.2*Math.max(1,Number(node&&node._elitePowerMult)||1):1;
  const meteorMult=Math.max(0.1,Number(node&&node._meteorDebuff)||1);
  G._mapBattle={mapIndex:m.index,nodeId,type,forcedBoss:!!forced,floor,battleNo:m.battleCount,elitePowerMult,meteorMult};
  G.floor=G._mapBattle.floor;
  const turnMult=_mapTurnStrengthMult();
  G._extraBattleMult=turnMult*elitePowerMult*meteorMult;
  G._forceBossMult=type==='boss'?1.5*(forced?2:1)*turnMult*meteorMult:null;
  G._mapEliteBattle=type==='elite';
  G.phase='battle';
  document.body.classList.remove('world-map-active');
  showScreen('battle');
  startBattle();
}
function finishMapBattleVictory(){
  const b=G._mapBattle;
  if(!b||!G.worldMap) return false;
  const node=_mapNodeById(b.nodeId);
  if(node) node.cleared=true;
  if(node&&(node.type==='battle'||node.type==='elite')) node.type='empty';
  const wasBoss=b.type==='boss'||b.forcedBoss;
  if(b.type==='elite') G._eliteTreasureRewardPending=true;
  if(wasBoss&&G.worldMap){
    const left=Math.max(0,(G.worldMap.turnLimit||WORLD_MAP_BASE_TURN_LIMIT)-(G.worldMap.turn||0));
    const bonus=left*left*10;
    if(bonus>0){
      G.gold=(G.gold||0)+bonus;
      log(`ボス撃破ボーナス：${bonus}ゴールドを得た。`,'gold');
    }
  }
  G._mapBattle=null;
  G._mapEliteBattle=false;
  G._forceBossMult=null;
  if(wasBoss){
    const run=G.worldMapRun||{index:G.worldMap.index||1,max:WORLD_MAP_MAX_INDEX};
    if((run.index||G.worldMap.index||1)>=WORLD_MAP_MAX_INDEX){
      G._mapBossRewardPendingAdvance=false;
      if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
      G.phase='clear';
      showScreen('clear');
      return true;
    }
    G._mapBossRewardPendingAdvance=true;
    return false;
  }
  return false;
}
function advanceWorldMapAfterBoss(){
  G._mapBossRewardPendingAdvance=false;
  const run=G.worldMapRun||{index:1,max:WORLD_MAP_MAX_INDEX};
  if((run.index||1)>=WORLD_MAP_MAX_INDEX){
    G.phase='clear';
    showScreen('clear');
    return;
  }
  run.index=(run.index||1)+1;
  G.worldMapRun=run;
  generateWorldMap(run.index);
  goToWorldMap();
}
function handleMapBattleDefeat(){
  const b=G._mapBattle;
  if(!b) return false;
  if(b.type==='boss'||b.forcedBoss) return false;
  const alive=(G.enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject).length;
  if(G.worldMap) G.worldMap.turn=(G.worldMap.turn||0)+alive;
  G._mapBattle=null;
  G._mapEliteBattle=false;
  G._forceBossMult=null;
  G.allies=(G.allies||[]).map(u=>u&&u._panelSummoned?null:u);
  G.enemies=[];
  G.phase=null;
  goToReward();
  return true;
}
function openMapFormation(){
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  _rewCards=[];
  _rewFreePickDone=true;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  _rewCards=[];
  _rewFreePickDone=true;
  renderRewCards();
  renderMoveSlotsInEnemy();
}
function shopDone(){
  if(G._pendingPanelPlacement) return;
  if(G._eliteTreasureRewardPending){
    G._eliteTreasureRewardPending=false;
    openMapTreasure();
    return;
  }
  if(G._mapReturnAfterReward||G.worldMap) goToWorldMap();
}
function returnToMapVillage(){
  if(G._pendingPanelPlacement) return;
  openMapVillage();
}
function returnToMapAfterTreasure(){
  if(G._pendingPanelPlacement) return;
  G._isTreasureMapReward=false;
  goToWorldMap();
}
function enterVillageNode(node){
  node.cleared=true;
  openMapVillage();
}
function openMapVillage(){
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=true;
  G._isTreasureMapReward=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  _rewCards=[];
  _rewFreePickDone=true;
  const section=document.getElementById('battle-order-section');
  const row=document.getElementById('battle-order-row');
  if(section&&row){
    section.style.display='';
    row.innerHTML='';
    [
      ['ショップ','販売カードを確認する',openMapShop],
      ['鍛冶屋','魔導板パネルを改良する',openMapForge],
    ].forEach(([name,desc,fn])=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='map-village-card';
      btn.innerHTML=`<strong>${name}</strong><span>${desc}</span>`;
      btn.onclick=fn;
      row.appendChild(btn);
    });
  }
  renderMoveSlotsInEnemy();
}
function _mapSalePrice(card){
  const r=Math.max(1,Math.min(5,Number(card&&card.rarity)||1));
  return ({1:80,2:160,3:320,4:560,5:800})[r]||80;
}
function _mapPickSaleCard(pred, used){
  ensurePanelSaleStock();
  const pool=(PANEL_POOL||[]).filter(p=>p&&p.id&&_isImplementedPoolCard(p)&&!p._rewardExcluded&&p.rarity!==-1&&panelSaleStockCount(p)>0&&!used.has(p.id)&&pred(p));
  if(!pool.length) return null;
  const currentGrade=typeof _currentRewardMapGrade==='function'?_currentRewardMapGrade(G.rewardGrade||1):(G.rewardGrade||1);
  const def=typeof _rewardWeightedPick==='function'?_rewardWeightedPick(pool,currentGrade,used):randFrom(pool);
  if(!def) return null;
  consumePanelSaleStock(def);
  used.add(def.id);
  const card=makePanel(def.id);
  if(card) card._buyPrice=_mapSalePrice(card);
  return card;
}
function openMapShop(){
  G._mapReturnAfterReward=true;
  G._isShop=true;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G._freeRewardPanelMode=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  const node=_mapCurrentVillageNode();
  if(node&&Array.isArray(node.shopStock)){
    _rewCards=clone(node.shopStock||[]);
  }else{
    const used=new Set();
    _rewCards=[
      _mapPickSaleCard(p=>Number(p.rarity)===1,used),
      _mapPickSaleCard(p=>Number(p.rarity)===1,used),
      _mapPickSaleCard(p=>Number(p.rarity)>=2,used),
      _mapPickSaleCard(p=>Number(p.rarity)>=2,used),
      _mapPickSaleCard(p=>Number(p.rarity)>=3,used),
    ];
    if(node) node.shopStock=clone(_rewCards);
  }
  G._isShop=true;
  G._freeRewardPanelMode=false;
  _rewFreePickDone=false;
  renderRewCards();
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderHandEditor();
  renderMoveSlotsInEnemy();
}
function openMapForge(){
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isForge=true;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  _rewCards=[];
  _rewFreePickDone=true;
  const node=_mapCurrentVillageNode();
  if(node&&Array.isArray(node.forgeOffers)){
    G._mapForgeOffers=clone(node.forgeOffers||[]);
  }else{
    G._mapForgeOffers=_pickMapForgeOffers();
    if(node) node.forgeOffers=clone(G._mapForgeOffers||[]);
  }
  renderMapForgeOffers();
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderMoveSlotsInEnemy();
}
function _pickMapForgeOffers(){
  const pool=MAP_PANEL_POWERS.filter(p=>p.id!=='summon');
  const picks=[MAP_PANEL_POWERS[0]];
  while(picks.length<3&&pool.length){
    picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }
  return picks;
}
function renderMapForgeOffers(){
  const section=document.getElementById('battle-order-section');
  const row=document.getElementById('battle-order-row');
  if(!section||!row) return;
  section.style.display='';
  row.innerHTML='';
  (G._mapForgeOffers||[]).forEach(power=>{
    if(!power) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='map-forge-card';
    btn.innerHTML=`<strong>${power.name}</strong><span>${power.desc}</span><em>${power.price}ゴールド</em>`;
    btn.disabled=(G.gold||0)<power.price;
    btn.onclick=()=>{
      if((G.gold||0)<power.price) return;
      G._pendingMapForgePower=power;
      renderMapForgeOffers();
      renderHandEditor();
    };
    if(G._pendingMapForgePower&&G._pendingMapForgePower.id===power.id) btn.classList.add('selected');
    row.appendChild(btn);
  });
  renderHandEditor();
}
function applyPendingMapForgePower(slotIdx){
  const power=G._pendingMapForgePower;
  if(!power||!Number.isInteger(slotIdx)) return false;
  if(_isMapForgeBlockedSlot(slotIdx)) return false;
  if((G.gold||0)<power.price) return false;
  G.mapPanelPowers=G.mapPanelPowers||{};
  G.mapPanelPowers[slotIdx]=power.id;
  G.gold-=power.price;
  const offerIdx=(G._mapForgeOffers||[]).findIndex(p=>p&&p.id===power.id);
  if(offerIdx>=0) G._mapForgeOffers[offerIdx]=null;
  const node=_mapCurrentVillageNode();
  if(node) node.forgeOffers=clone(G._mapForgeOffers||[]);
  G._pendingMapForgePower=null;
  if(typeof refreshRewardGoldUi==='function') refreshRewardGoldUi();
  else {
    const gold=document.getElementById('rw-gold');
    if(gold&&typeof rewardGoldText==='function') gold.textContent=rewardGoldText();
    updateHUD();
  }
  renderMapForgeOffers();
  renderHandEditor();
  return true;
}
function _isMapForgeBlockedSlot(slotIdx){
  return Number.isInteger(slotIdx)&&slotIdx>=5&&slotIdx<=9;
}
function syncCurrentVillageFacilityStateFromReward(){
  const node=_mapCurrentVillageNode();
  if(!node) return;
  if(G._isShop) node.shopStock=clone(_rewCards||[]);
  if(G._isForge) node.forgeOffers=clone(G._mapForgeOffers||[]);
}
function openMapTavern(){
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isTavern=true;
  G._isForge=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  _rewCards=[];
  _rewFreePickDone=true;
  const cur=_mapCurrentNode();
  const boss=(G.worldMap?.nodes||[]).find(n=>n.type==='boss');
  const dx=boss&&cur?boss.x-cur.x:0, dy=boss&&cur?boss.y-cur.y:0;
  const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'東':'西'):(dy>0?'南':'北');
  const section=document.getElementById('battle-order-section');
  const row=document.getElementById('battle-order-row');
  if(section&&row){
    section.style.display='';
    row.innerHTML=`<div class="map-tavern-card"><strong>酒場の噂</strong><span>ボスはおおよそ${dir}の方角にいる。</span></div>`;
  }
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderMoveSlotsInEnemy();
}
function enterTreasureNode(node){
  if(node){
    node.cleared=true;
    node.type='empty';
  }
  openMapTreasure();
}
function openMapTreasure(){
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=true;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  _rewCards=[];
  const item=(typeof drawItems==='function'?drawItems(1,5):[])[0]||null;
  if(item){
    item._isTreasure=true;
    item._buyPrice=0;
    _rewCards=[item];
    _rewFreePickDone=false;
  }else{
    _rewFreePickDone=true;
  }
  renderRewCards();
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderMoveSlotsInEnemy();
}
function resolveMapEvent(node){
  node.cleared=true;
  const r=Math.floor(Math.random()*3);
  if(r===0){
    const c=drawPanel(1,Math.min(5,G.rewardGrade||1))[0];
    const idx=(G.mainBoard||[]).findIndex(x=>!x);
    if(c&&idx>=0) G.mainBoard[idx]=c;
  } else if(r===1){
    G.gold=(G.gold||0)+100;
  } else {
    G.worldMap.turnLimit=(G.worldMap.turnLimit||WORLD_MAP_BASE_TURN_LIMIT)+3;
  }
  renderWorldMap();
  updateHUD();
}
