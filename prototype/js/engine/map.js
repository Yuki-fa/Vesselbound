// ═══════════════════════════════════════
// map.js — 7x7ワールドマップ進行
// 依存: state.js, floors.js, pool.js, enemy.js, reward.js
// ═══════════════════════════════════════

const WORLD_MAP_ENABLED=true;
const WORLD_MAP_SIZE=7;
const WORLD_MAP_MAX_INDEX=4;
const WORLD_MAP_BASE_TURN_LIMIT=15;
const WORLD_MAP_CENTER=3*WORLD_MAP_SIZE+3;
function _pickWorldMapStartId(){
  const candidates=[];
  for(let y=2;y<=4;y++){
    for(let x=2;x<=4;x++) candidates.push(_mapIdx(x,y));
  }
  return randFrom(candidates)||WORLD_MAP_CENTER;
}
const MAP_PANEL_POWERS=[
  {id:'summon',name:'召喚の力',price:200,desc:'置いたカードがキャラクターなら開戦時に場に出る。'},
  {id:'life',name:'生命の力',price:400,desc:'置いたカードがキャラクターなら、開戦時に場に出してHPを2倍にする。'},
  {id:'eternal',name:'永劫の力',price:600,desc:'置いたカードがキャラクターなら永久に+5/+5してから場に出る。'},
  {id:'resonance',name:'共鳴の力',price:800,desc:'置いたカードがキャラクターなら、開戦時に場に出して全ての同色の味方に+3/+3を与える。'},
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
  // 全49マス（7x7グリッド全体）を使い切るため、圧縮率を上げて配置間隔を広く取り、
  // ランダムなずれ幅も縮小する（そうしないと、無関係な道やアイコンが隣接マスの
  // アイコンにめり込むほど接近してしまう）。
  return {
    x,
    y,
    px:Math.max(22,Math.min(78,50+(rawX-50)*0.82+(Math.random()-.5)*2.5)),
    py:Math.max(20,Math.min(80,50+(rawY-50)*0.82+(Math.random()-.5)*2)),
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
function _mapOrientation(a,b,c){
  return ((b.py-a.py)*(c.px-b.px))-((b.px-a.px)*(c.py-b.py));
}
function _mapSegmentsIntersect(a,b,c,d){
  const o1=_mapOrientation(a,b,c);
  const o2=_mapOrientation(a,b,d);
  const o3=_mapOrientation(c,d,a);
  const o4=_mapOrientation(c,d,b);
  return (o1*o2<0)&&(o3*o4<0);
}
function _mapEdgeCrossesAny(from,to,edges,pointFor){
  const a=pointFor(from);
  const b=pointFor(to);
  return (edges||[]).some(e=>{
    const sharesEndpoint=e[0]===from||e[1]===from||e[0]===to||e[1]===to;
    if(sharesEndpoint) return false;
    return _mapSegmentsIntersect(a,b,pointFor(e[0]),pointFor(e[1]));
  });
}
// 点pから線分abまでの最短距離（px/py座標系）。
function _mapPointToSegmentDist(p,a,b){
  const dx=b.px-a.px,dy=b.py-a.py;
  const lenSq=dx*dx+dy*dy;
  if(lenSq<=0) return Math.hypot(p.px-a.px,p.py-a.py);
  const t=Math.max(0,Math.min(1,((p.px-a.px)*dx+(p.py-a.py)*dy)/lenSq));
  return Math.hypot(p.px-(a.px+t*dx),p.py-(a.py+t*dy));
}
// 道（辺）が、その両端以外の既存マスのアイコンに近づきすぎないようにする
// （無関係な道やアイコンとの重なり・過度な接近を避けるため）。
const MAP_EDGE_NODE_CLEARANCE=4.5;
function _mapEdgeStaysClearOfOtherNodes(from,to,pickedIds,pointFor){
  const a=pointFor(from),b=pointFor(to);
  for(const id of pickedIds){
    if(id===from||id===to) continue;
    if(_mapPointToSegmentDist(pointFor(id),a,b)<MAP_EDGE_NODE_CLEARANCE) return false;
  }
  return true;
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
function _mapGraphDistanceInEdges(a,b,nodes,edges){
  if(a==null||b==null) return 999;
  if(a===b) return 0;
  const exists=new Set((nodes||[]).map(n=>n&&n.id).filter(id=>id!=null));
  if(!exists.has(a)||!exists.has(b)) return 999;
  const seen=new Set([a]);
  const q=[{id:a,dist:0}];
  while(q.length){
    const cur=q.shift();
    for(const edge of (edges||[])){
      const nb=edge[0]===cur.id?edge[1]:(edge[1]===cur.id?edge[0]:null);
      if(nb==null||!exists.has(nb)||seen.has(nb)) continue;
      if(nb===b) return cur.dist+1;
      seen.add(nb);
      q.push({id:nb,dist:cur.dist+1});
    }
  }
  return 999;
}
function _mapGridDistance(a,b){
  if(!a||!b) return 999;
  return Math.abs((a.x||0)-(b.x||0))+Math.abs((a.y||0)-(b.y||0));
}
function _mapIsAdjacentCell(a,b){
  if(!a||!b||a===b) return false;
  return Math.max(Math.abs((a.x||0)-(b.x||0)),Math.abs((a.y||0)-(b.y||0)))<=1;
}
// マップ構成比率：全49マス（初期位置1＋村4＋通常戦闘20＋エリート4＋イベント15＋宝箱5）。
// ボスはマップ上に配置せず、ターン制限到達時にのみ出現する（_startForcedWorldMapBossBattle参照）。
const WORLD_MAP_TOTAL_TILES=49;
const WORLD_MAP_TILE_COUNTS={village:4,treasure:5,elite:4,event:15,battle:20};
const _MAP_SPACED_SAME_TYPES=new Set(['village','elite','treasure']);
function _mapSameTypeSpacingOk(node,type,nodes,edges,minDist){
  if(!_MAP_SPACED_SAME_TYPES.has(type)) return true;
  return !(nodes||[]).some(n=>n&&n!==node&&n.type===type&&_mapGraphDistanceInEdges(node.id,n.id,nodes,edges)<minDist);
}
// 未確定（まだtype==='battle'のまま）のマスからランダムにcount個選び、指定typeへ変更する。
// extraCheckがある場合はそれも満たすマスのみ対象（エリートの距離制約など）。
// 条件を満たすマスが不足する場合は置ける分だけ配置し、残りは通常戦闘のまま残す。
function _assignMapTypeBatch(nodes,edges,startId,type,count,extraCheck){
  const pool=(nodes||[]).filter(n=>n&&n.id!==startId&&n.type==='battle').sort(()=>Math.random()-.5);
  let placed=0;
  for(const n of pool){
    if(placed>=count) break;
    if(!_mapSameTypeSpacingOk(n,type,nodes,edges,3)) continue;
    if(extraCheck&&!extraCheck(n)) continue;
    n.type=type;
    placed++;
  }
  return placed;
}
// 初期配置の比率をこの順で確定する：村→宝箱→エリート（村・宝箱からの距離制約があるため後に置く）→イベント→残りは通常戦闘。
function _assignInitialMapNodeTypes(nodes,edges,startId){
  nodes.forEach(n=>{ if(n&&n.id!==startId) n.type='battle'; });
  _assignMapTypeBatch(nodes,edges,startId,'village',WORLD_MAP_TILE_COUNTS.village);
  _assignMapTypeBatch(nodes,edges,startId,'treasure',WORLD_MAP_TILE_COUNTS.treasure);
  _assignMapTypeBatch(nodes,edges,startId,'elite',WORLD_MAP_TILE_COUNTS.elite,n=>{
    if((Number(n.dist)||0)<4) return false;
    return !(nodes||[]).some(o=>o&&(o.type==='village'||o.type==='treasure')&&_mapGraphDistanceInEdges(n.id,o.id,nodes,edges)<2);
  });
  _assignMapTypeBatch(nodes,edges,startId,'event',WORLD_MAP_TILE_COUNTS.event);
  // 残りは_newMapNode由来の初期値'battle'のまま（通常戦闘20マス相当）。
}
// ボスはマップ上に配置しないため、中盤での再配置処理は不要（過去のボスマス移設ロジックは廃止）。
function _applyWorldMapTurnEvents(){
  return false;
}
function _triggerWorldMapDefeat(reason){
  const m=G&&G.worldMap;
  if(m) m.defeatedReason=reason||'map';
  if(typeof gameOver==='function') gameOver();
  else { G.phase='gameover'; showScreen('gameover'); }
  return {type:'gameover',id:m&&m.current};
}
function _worldMapLimitReached(){
  const m=G&&G.worldMap;
  if(!m) return false;
  return (Number(m.turn)||0)>=Number(m.turnLimit||WORLD_MAP_BASE_TURN_LIMIT);
}
function _worldMapNextTurnWouldForceBoss(){
  const m=G&&G.worldMap;
  if(!m) return false;
  // 15ターン目（＝制限ターンちょうど）の移動でボス戦を強制する（1ターン遅らせた仕様）。
  return (Number(m.turn)||0)>=Number(m.turnLimit||WORLD_MAP_BASE_TURN_LIMIT);
}
// ボスはマップ上に配置しない。ターン制限（15ターン目）に到達する移動の時点で、
// その時点のプレイヤーの現在地にボスが出現する。
function _startForcedWorldMapBossBattle(){
  const m=G&&G.worldMap;
  if(!m) return false;
  const boss=_mapNodeById(m.current);
  if(!boss) return false;
  boss.type='boss';
  boss.cleared=false;
  boss.visible=true;
  m.revealed=m.revealed||{};
  m.revealed[boss.id]=true;
  m.forcedBoss=true;
  m.turn=Math.max(Number(m.turn)||0,Number(m.turnLimit||WORLD_MAP_BASE_TURN_LIMIT));
  startMapBattle('boss',boss.id,true);
  return true;
}
function _checkWorldMapTurnLimitDefeat(){
  return false;
}
function _mapNodeForceIconVisible(n){
  return !!(n&&n.type==='boss');
}
function getWorldMapStageBackgroundKey(){
  if(G&&G._waveLoopEnabled){
    if(Number(G._wave)===5) return 'stageEnd';
    const wave=Math.max(1,Math.min(4,Number(G._wave)||1));
    return `stage${wave}`;
  }
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
  return node&&['village','merchant','altar'].includes(node.type)?node:null;
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
  // エリートは常時位置を開示する仕様のため、他タイプのように未発見時は隠す、という
  // 分岐は行わない（エリートの可視化はここではなく配置・移動処理側で都度行う）。
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
function _routeNodeType(routeType,step){
  const layouts={battle:['battle','battle','event','elite'],explore:['battle','event','treasure','event'],supply:['battle',Math.random()<.5?'merchant':'altar','event','battle']};
  return (layouts[routeType]||layouts.explore)[step]||'battle';
}
function _routeRating(type){ return ({battle:20,elite:40,event:10,treasure:20,merchant:30,altar:40}[type]||0); }
function _makeRouteNode(id,type,stage,routeIndex,step,px,py,routeType){
  const node=_newMapNode(id,{x:id,y:id,px,py});
  Object.assign(node,{type,stage,routeIndex,routeType,routeStep:step,routeRating:_routeRating(type),visible:stage===0});
  return node;
}
function generateWorldMap(index){
  const nodes=[],edges=[],routeEdges={};
  let nextId=0;
  const start=_makeRouteNode(nextId++,'start',0,-1,0,18,50,'');
  start.visited=true; start.cleared=true;
  const village=_makeRouteNode(nextId++,'village',0,-1,5,50,50,'');
  village._intermediate=true; village.visible=true;
  const boss=_makeRouteNode(nextId++,'boss',1,-1,5,82,50,'');
  boss.visible=true;
  nodes.push(start,village,boss);
  const routeTypes=['battle','explore','supply'].sort(()=>Math.random()-.5);
  const firstY=[32,50,68],secondY=[38,50,62];
  const makeRoute=(stage,routeIndex,routeType,from,to,ys)=>{
    let previous=from;
    for(let step=0;step<4;step++){
      const x=stage===0?26+step*4.5:56+step*4.5;
      const n=_makeRouteNode(nextId++,_routeNodeType(routeType,step),stage,routeIndex,step,x,ys[routeIndex],routeType);
      nodes.push(n); edges.push([previous.id,n.id]);
      routeEdges[_mapEdgeKey(previous.id,n.id)]={stage,routeIndex,routeType}; previous=n;
    }
    edges.push([previous.id,to.id]); routeEdges[_mapEdgeKey(previous.id,to.id)]={stage,routeIndex,routeType};
  };
  routeTypes.forEach((type,i)=>makeRoute(0,i,type,start,village,firstY));
  routeTypes.forEach((type,i)=>makeRoute(1,i,type,village,boss,secondY));
  const revealed={}; nodes.forEach(n=>{if(n.visible) revealed[n.id]=true;});
  const m={index:index||1,turn:0,turnLimit:WORLD_MAP_BASE_TURN_LIMIT,current:start.id,startId:start.id,bossId:boss.id,intermediateVillageId:village.id,stage:0,selectedRoute:null,selectedRoutes:{},nodes,revealed,revealedEdges:{},routeEdges,forcedBoss:false,eliteBossBonusMult:1,moveHistory:[start.id],zoom:1.8,edges};
  G.worldMap=m; _computeMapDistances(nodes,start.id,edges);
  nodes.filter(n=>n.routeStep===3).forEach(n=>{n.routeRatingTotal=nodes.filter(x=>x.stage===n.stage&&x.routeIndex===n.routeIndex).reduce((sum,x)=>sum+(x.routeRating||0),0);});
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
    const canPeekNode=id=>{
      const n=by.get(id);
      return !!n&&!(n.type==='elite'&&!G.worldMap.revealed?.[n.id]);
    };
    roadDepth.set(currentNode.id,0);
    _mapEdgeNeighbors(currentNode.id,G.worldMap.edges).forEach(id=>{ if(canPeekNode(id)) roadDepth.set(id,1); });
    [...roadDepth.entries()].forEach(([id,d])=>{
      if(d>=1) return;
      _mapEdgeNeighbors(id,G.worldMap.edges).forEach(nb=>{
        if(canPeekNode(nb)&&!roadDepth.has(nb)) roadDepth.set(nb,d+1);
      });
    });
  }
  (G.worldMap.edges||[]).forEach(pair=>{
      const n=by.get(pair[0]);
      const m=by.get(pair[1]);
      if(!n||!m) return;
      const bothVisible=n.visible&&m.visible;
      const edgeKey=_mapEdgeKey(n.id,m.id);
      const edgeRevealed=!!(G.worldMap.revealedEdges&&G.worldMap.revealedEdges[edgeKey]);
      const hiddenEliteEndpoint=(n.type==='elite'&&!G.worldMap.revealed?.[n.id])||(m.type==='elite'&&!G.worldMap.revealed?.[m.id]);
      const peekingRoad=!hiddenEliteEndpoint&&((roadDepth.get(n.id)<=1)||(roadDepth.get(m.id)<=1));
      if(hiddenEliteEndpoint&&!edgeRevealed) return;
      if(!bothVisible&&!peekingRoad&&!edgeRevealed) return;
      if(bothVisible||peekingRoad) _markMapEdgeRevealed(n.id,m.id);
      const edge=document.createElement('div');
      edge.className=`map-edge${bothVisible?'':' preview'}${edgeRevealed&&!bothVisible&&!peekingRoad?' remembered':''}`;
      const routeInfo=G.worldMap.routeEdges&&G.worldMap.routeEdges[edgeKey];
      const selectedEdgeRoute=_mapSelectedRouteForStage(routeInfo&&routeInfo.stage);
      if(selectedEdgeRoute!=null&&routeInfo&&routeInfo.routeIndex!==selectedEdgeRoute) edge.classList.add('route-muted');
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
  const selectable=new Set(_mapEdgeNeighbors(current,G.worldMap.edges)
    .map(id=>by.get(id)).filter(n=>{
      const selectedRoute=_mapSelectedRouteForStage(n&&n.stage);
      return n&&n.visible&&n.px>currentNode.px&&(n._intermediate||(selectedRoute==null||n.routeIndex===selectedRoute));
    }).map(n=>n.id));
  G.worldMap.nodes.forEach(n=>{
    const forceIcon=_mapNodeForceIconVisible(n);
    if(!n.visible&&!forceIcon) return;
    const btn=document.createElement('button');
    const type=n.id===current?(n._intermediate?'empty2':'player'):(n.cleared&&!['village','merchant','altar','boss'].includes(n.type)?(n._clearedEvent?'empty2':'empty'):n.type);
    btn.className=`map-node type-${n.type}`;
    const selectedNodeRoute=_mapSelectedRouteForStage(n.stage);
    if(selectedNodeRoute!=null&&n.routeIndex>=0&&n.routeIndex!==selectedNodeRoute) btn.classList.add('route-muted');
    // エリートの1歩目：実際にはまだ移動していないが、道の途中（自分と目的地の中間点）に
    // 見た目だけ表示する。ここをクリックすると「ここで迎撃しますか？」の確認を出す。
    const midStepTarget=(n.type==='elite'&&n._eliteStepTargetId!=null)?by.get(n._eliteStepTargetId):null;
    const px=midStepTarget?(n.px+midStepTarget.px)/2:n.px;
    const py=midStepTarget?(n.py+midStepTarget.py)/2:n.py;
    btn.style.left=`${px}%`;
    btn.style.top=`${py}%`;
    if(midStepTarget) btn.classList.add('map-node-midstep');
    btn.style.backgroundImage=`url("${_mapNodeIcon(type)}")`;
    if(n.id===current) btn.classList.add('is-current');
    if(selectable.has(n.id)&&!midStepTarget) btn.classList.add('is-moveable');
    if(n.type==='boss') btn.classList.add('boss-visible');
    btn.title=_mapNodeTitle(n);
    const preview=_mapEnemyPreview(n);
    if(preview) btn.setAttribute('data-preview',preview);
    btn.onclick=()=>{
      if(G._pendingMapItemUse&&handlePendingMapItemNode(n.id)) return;
      if(midStepTarget){ _confirmInterceptElite(n); return; }
      if(n.id===current&&n.type==='village'&&!n._intermediate) openMapVillage();
      else if(n._intermediate&&n.px>currentNode.px) moveToMapNode(n.id);
      else if(selectable.has(n.id)){
        if(n.routeStep===0){
          G.worldMap.selectedRoute=n.routeIndex;
          G.worldMap.selectedRoutes=G.worldMap.selectedRoutes||{};
          G.worldMap.selectedRoutes[n.stage]=n.routeIndex;
        }
        moveToMapNode(n.id);
      }
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
  if(type==='village') return Assets.map.empty2||Assets.map.empty;
  if(type==='merchant') return Assets.map.shop;
  if(type==='altar') return Assets.map.altar||Assets.map.shop;
  if(type==='event') return Assets.map.event;
  if(type==='treasure') return Assets.map.treasure;
  if(type==='empty2') return Assets.map.empty2||Assets.map.empty;
  return Assets.map.empty;
}
function _mapSelectedRouteForStage(stage){
  const m=G&&G.worldMap;
  if(!m) return null;
  if(m.selectedRoutes&&Object.prototype.hasOwnProperty.call(m.selectedRoutes,stage)) return m.selectedRoutes[stage];
  return stage===m.stage?m.selectedRoute:null;
}
function _mapNodeTitle(n){
  const names={start:'開始地点',battle:'通常戦闘',elite:'エリート',boss:'ボス',village:'中間地点',merchant:'行商人',altar:'祭壇',event:'イベント',treasure:'宝箱'};
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
  const rel=Math.min(1,_mapEnemyPowerRating(node)/(5*1.5*(1+(WORLD_MAP_BASE_TURN_LIMIT||15)*0.05)));
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
  hud.innerHTML=`<div>ターン ${m.turn}/${m.turnLimit||WORLD_MAP_BASE_TURN_LIMIT}</div><button type="button" class="btn small" id="map-open-board-btn">編成</button><button type="button" class="btn small" id="map-wait-turn-btn">待機</button>`;
  const btn=hud.querySelector('#map-open-board-btn');
  if(btn) btn.onclick=()=>openMapFormation();
  const waitBtn=hud.querySelector('#map-wait-turn-btn');
  if(waitBtn) waitBtn.onclick=()=>skipWorldMapTurn();
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
    G.worldMap.moveHistory=[node.id];
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
// エリートの探知範囲（グラフ距離）：これ以内に初期位置・村・宝箱があれば最寄りを目指す。
const ELITE_DETECTION_RANGE=2;
// エリートが初期位置/村/宝箱に到達した際、自身とボスの戦力に1.2倍ボーナスを与える対象タイプ。
// 通常戦闘マスは到達すると（次に移動して離れた時点で）空白化されるがボーナスは付与しない。
const _ELITE_BONUS_TYPES=new Set(['start','village','treasure']);
// 探知範囲内で最も近い初期位置/村/宝箱を探す。他のエリートが既に今回のターンで目指している
// マス（claimedTargets）は除外し、複数のエリートが同じ場所を目指さないようにする。
function _elitePriorityTarget(node,claimedTargetIds){
  const m=G.worldMap;
  if(!m||!node) return null;
  const startId=m.startId!=null?m.startId:WORLD_MAP_CENTER;
  const candidates=[];
  (m.nodes||[]).forEach(n=>{
    if(!n||n===node) return;
    if(!(n.id===startId||n.type==='village'||n.type==='treasure')) return;
    if(claimedTargetIds&&claimedTargetIds.has(n.id)) return;
    const dist=_mapGraphDistance(node.id,n.id);
    if(dist>0&&dist<=ELITE_DETECTION_RANGE) candidates.push({node:n,dist});
  });
  if(!candidates.length) return null;
  candidates.sort((a,b)=>a.dist-b.dist||Math.random()-.5);
  const bestDist=candidates[0].dist;
  return randFrom(candidates.filter(t=>t.dist===bestDist)).node;
}
// 次の1マス先を決める。他のエリートが現在占有中のマス（occupiedIds）と、直前にいたマス
// （来た道）へは進まない。探知範囲内に目標が無ければ、進める隣接マスからランダムに選ぶ。
function _eliteNextNode(node,occupiedIds,claimedTargetIds){
  const m=G.worldMap;
  if(!m||!node) return null;
  const blocked=new Set(occupiedIds||[]);
  if(node._eliteFromId!=null) blocked.add(node._eliteFromId);
  const target=_elitePriorityTarget(node,claimedTargetIds);
  if(target){
    const path=_mapPathBetween(node.id,target.id);
    if(path.length>1&&!blocked.has(path[1])){
      return {node:_mapNodeById(path[1]),targetId:target.id};
    }
  }
  const candidates=_mapEdgeNeighbors(node.id,m.edges)
    .filter(id=>!blocked.has(id))
    .map(_mapNodeById)
    .filter(Boolean);
  if(!candidates.length) return null;
  return {node:randFrom(candidates),targetId:null};
}
// エリートを1体、1マス分だけ進める（2ターンに1回だけ実際に移動する）。
// 到達したマスが初期位置/村/宝箱/通常戦闘であればそのマスを空白化し、
// 初期位置/村/宝箱の場合はそのエリート自身とボスに戦力1.2倍ボーナスを与える（ボス分は蓄積）。
function _moveMapElites(){
  const m=G.worldMap;
  if(!m) return null;
  const elites=(m.nodes||[]).filter(n=>n&&n.type==='elite');
  let encounter=null;
  const startId=m.startId!=null?m.startId:WORLD_MAP_CENTER;
  const occupied=new Set(elites.map(n=>n.id));
  // 既に1歩目を終えて2歩目待ちのエリートが目指している先も、今回新たに1歩目を計画する
  // 別のエリートから見て「他エリートが目指している場所」として扱う。
  const claimedTargets=new Set(elites.map(n=>n._eliteStepTargetId).filter(id=>id!=null));
  elites.forEach(n=>{
    if(n.type!=='elite') return;
    n._eliteMoveClock=(n._eliteMoveClock||0)+1;
    if(n._eliteMoveClock===1){
      // 1歩目：行き先だけを決める。実際の移動（マス種別の変更）は2歩目で行い、
      // それまでの間は見た目上「道の途中」に表示する（renderWorldMap側で中間点に描画）。
      occupied.delete(n.id);
      const step=_eliteNextNode(n,occupied,claimedTargets);
      occupied.add(n.id);
      if(step&&step.node){
        n._eliteStepTargetId=step.node.id;
        if(step.targetId!=null) claimedTargets.add(step.targetId);
      }else{
        n._eliteStepTargetId=null;
      }
      return;
    }
    if(n._eliteMoveClock<2) return;
    n._eliteMoveClock=0;
    const targetId=n._eliteStepTargetId;
    n._eliteStepTargetId=null;
    if(targetId==null) return;
    const to=_mapNodeById(targetId);
    // 計画から実行までの間に他エリートに先取りされていた場合は、今回の移動を諦める
    // （次のサイクルで改めて行き先を選び直す）。
    if(!to||occupied.has(to.id)||to.type==='elite') return;
    occupied.delete(n.id);
    const fromId=n.id;
    const mult=Number(n._elitePowerMult)||1;
    // 到達先が村/初期位置だった場合、それを踏み荒らしたエリートと戦う時も村/初期位置の
    // 地形援軍が出るよう、元の地形種別を保持しておく（_applyTerrainReinforcements参照）。
    const absorbedTerrain=(to.type==='village'||to.id===startId)?(to.id===startId?'start':'village'):'';
    n.type='empty';
    n.cleared=true;
    delete n._elitePowerMult;
    delete n._eliteFromId;
    const grantsBonus=_ELITE_BONUS_TYPES.has(to.type)||to.id===startId;
    to.type='elite';
    to.cleared=false;
    to._eliteMoveClock=0;
    to._eliteStepTargetId=null;
    to._eliteFromId=fromId;
    to._elitePowerMult=grantsBonus?mult*1.2:mult;
    if(absorbedTerrain) to._terrainType=absorbedTerrain;
    if(grantsBonus) m.eliteBossBonusMult=(Number(m.eliteBossBonusMult)||1)*1.2;
    // エリートは常時位置を開示する仕様のため、移動先も即座に可視化する。
    to.visible=true;
    m.revealed=m.revealed||{};
    m.revealed[to.id]=true;
    occupied.add(to.id);
    if(to.id===m.current) encounter=to;
  });
  return encounter;
}
function _mapTurnStrengthMult(){
  const m=G.worldMap;
  const turn=Math.max(0,Number(m&&m.turn)||0);
  return 1+turn*.05;
}
async function skipWorldMapTurn(){
  const m=G.worldMap;
  if(!m||G.phase!=='map'||G._mapAutoMoving) return false;
  G._mapAutoMoving=true;
  try{
    if(_worldMapNextTurnWouldForceBoss()) return !!_startForcedWorldMapBossBattle();
    m.turn=(Number(m.turn)||0)+1;
    _applyWorldMapTurnEvents();
    _revealAroundCurrentMapNode();
    renderWorldMap();
    updateHUD();
    await _mapDelay(180);
    return false;
  }finally{
    G._mapAutoMoving=false;
  }
}
async function _moveToAdjacentMapNode(id,options){
  const m=G.worldMap;
  if(!m||!_mapNodeById(id)) return false;
  const fromNode=_mapCurrentNode(), toNode=_mapNodeById(id);
  if(fromNode&&toNode&&toNode.px<=fromNode.px) return false;
  if(!_mapEdgeNeighbors(m.current,m.edges).includes(id)) return false;
  if(_worldMapNextTurnWouldForceBoss()) return !!_startForcedWorldMapBossBattle();
  m.current=id;
  m.moveHistory=Array.isArray(m.moveHistory)?m.moveHistory:[];
  m.moveHistory.push(id);
  if(m.moveHistory.length>30) m.moveHistory.shift();
  m.turn++;
  _applyWorldMapTurnEvents();
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
    if(node._intermediate){
      node._asEmptyTransit=true;
      m.stage=1; m.selectedRoute=null;
      (m.nodes||[]).filter(n=>n.stage===1).forEach(n=>{n.visible=true; m.revealed[n.id]=true;});
      renderWorldMap();
      return false;
    }
    if(options&&options.passThrough) renderWorldMap();
    else enterVillageNode(node);
    return !(options&&options.passThrough);
  } else if(node.type==='merchant'){
    openMapShop();
    return true;
  } else if(node.type==='altar'){
    openMapForge();
    return true;
  } else if(node.type==='event'){
    resolveMapEvent(node);
    return true;
  } else if(node.type==='treasure'){
    enterTreasureNode(node);
    return true;
  } else {
    _revealAroundCurrentMapNode();
    renderWorldMap();
    return false;
  }
}
// マップ上の確認ダイアログ（「はい/いいえ」形式）。中央固定オーバーレイとして表示する。
function _openMapConfirmDialog(message,onYes){
  _closeMapConfirmDialog();
  const div=document.createElement('div');
  div.id='map-confirm-dialog';
  div.innerHTML=`<div class="map-confirm-box"><div class="map-confirm-msg">${message}</div><div class="map-confirm-btns"><button type="button" class="btn map-confirm-yes">はい</button><button type="button" class="btn map-confirm-no">いいえ</button></div></div>`;
  document.body.appendChild(div);
  div.querySelector('.map-confirm-yes').onclick=()=>{ _closeMapConfirmDialog(); if(typeof onYes==='function') onYes(); };
  div.querySelector('.map-confirm-no').onclick=()=>{ _closeMapConfirmDialog(); };
}
function _closeMapConfirmDialog(){
  const el=document.getElementById('map-confirm-dialog');
  if(el) el.remove();
}
// 道の途中（1歩目）のエリートに対する「ここで迎撃しますか？」確認。
function _confirmInterceptElite(node){
  _openMapConfirmDialog('ここで迎撃しますか？',()=>_interceptElite(node));
}
async function _interceptElite(node){
  const m=G.worldMap;
  if(!m||G._mapAutoMoving||!node) return;
  if(_worldMapNextTurnWouldForceBoss()){ _startForcedWorldMapBossBattle(); return; }
  // このエリートは移動を中断してその場（プレイヤーの現在地）で迎撃される。
  delete node._eliteStepTargetId;
  m.turn=(Number(m.turn)||0)+1;
  _applyWorldMapTurnEvents();
  renderWorldMap();
  updateHUD();
  await _mapDelay(120);
  startMapBattle('elite',node.id,false);
}
// 移動先（経路上のいずれかのマスを含む）がエリートの場合は、実行前に警告を挟む。
function moveToMapNode(id){
  const m=G.worldMap;
  if(!m||!_mapNodeById(id)||id===m.current||G._mapAutoMoving) return;
  const currentNode=_mapCurrentNode(), targetNode=_mapNodeById(id);
  if(currentNode&&targetNode&&targetNode.px<=currentNode.px) return;
  const path=_mapPathBetween(m.current,id);
  if(path.length<2) return;
  _executeMoveToMapNode(id);
}
async function _executeMoveToMapNode(id){
  const m=G.worldMap;
  if(!m||!_mapNodeById(id)||id===m.current||G._mapAutoMoving) return;
  const currentNode=_mapCurrentNode(), targetNode=_mapNodeById(id);
  if(currentNode&&targetNode&&targetNode.px<=currentNode.px) return;
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
    _revealAroundCurrentMapNode();
    if(_worldMapLimitReached()) _startForcedWorldMapBossBattle();
    else renderWorldMap();
  }
}
function startMapBattle(type,nodeId,forced){
  const m=G.worldMap;
  const node=_mapNodeById(nodeId);
  const currentNode=_mapNodeById(m&&m.current);
  const terrainNode=currentNode||node;
  const terrainType=(terrainNode&&(terrainNode._terrainType||terrainNode.type))||'';
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G._pendingMapForgePower=null;
  G._mapForgeAnimating=false;
  G._mapForgeCandidateSlots=null;
  G._mapForgeHighlightSlot=null;
  document.body?.classList.remove('map-forge-roll-hide-cards');
  const fixedDeep=type==='elite'?4:(type==='boss'?5:null);
  const floor=_mapEffectiveFloor(nodeId||m.current,fixedDeep);
  m.battleCount=(m.battleCount||0)+1;
  let normalBattleNo=0;
  if(type==='battle'){
    m.normalBattleCount=(m.normalBattleCount||0)+1;
    normalBattleNo=m.normalBattleCount;
  }
  const elitePowerMult=type==='elite'?1.2*Math.max(1,Number(node&&node._elitePowerMult)||1):1;
  const meteorMult=Math.max(0.1,Number(node&&node._meteorDebuff)||1);
  G._mapBattle={mapIndex:m.index,nodeId,type,forcedBoss:!!forced,floor,battleNo:m.battleCount,normalBattleNo,turn:Number(m.turn)||0,elitePowerMult,meteorMult,terrainType,terrainNodeId:terrainNode&&terrainNode.id};
  G.floor=G._mapBattle.floor;
  const turnMult=_mapTurnStrengthMult();
  G._extraBattleMult=turnMult*elitePowerMult*meteorMult;
  const eliteBossBonusMult=Math.max(1,Number(m&&m.eliteBossBonusMult)||1);
  G._forceBossMult=type==='boss'?1.5*(forced?2:1)*turnMult*meteorMult*eliteBossBonusMult:null;
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
  // ボス報酬ゴールドは廃止。
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
// 通常戦闘・エリート戦敗北時：自分が移動してきた道を2歩遡る。遡れない場合は、
// 視認できている村と初期地点のうち近い方へワープする。
function _retreatWorldMapAfterDefeat(){
  const m=G.worldMap;
  if(!m) return;
  const hist=Array.isArray(m.moveHistory)?m.moveHistory:[];
  let idx=hist.length-1;
  while(idx>=0&&hist[idx]!==m.current) idx--;
  const backIdx=idx-2;
  let targetId=(backIdx>=0&&_mapNodeById(hist[backIdx]))?hist[backIdx]:null;
  if(targetId==null){
    const startId=m.startId!=null?m.startId:WORLD_MAP_CENTER;
    let best=_mapNodeById(startId);
    let bestDist=_mapGraphDistance(m.current,startId);
    (m.nodes||[]).filter(n=>n&&n.type==='village'&&n.visible).forEach(v=>{
      const d=_mapGraphDistance(m.current,v.id);
      if(d<bestDist){ bestDist=d; best=v; }
    });
    targetId=best?best.id:startId;
  }
  m.current=targetId;
  m.moveHistory=[targetId];
  const node=_mapNodeById(targetId);
  if(node) node.visited=true;
  _revealAroundCurrentMapNode();
}
function handleMapBattleDefeat(){
  const b=G._mapBattle;
  if(!b) return false;
  if(b.type==='boss'||b.forcedBoss){
    G._mapBattle=null;
    G._mapEliteBattle=false;
    G._forceBossMult=null;
    _triggerWorldMapDefeat('boss_defeat');
    return true;
  }
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
  G._isItemShop=false;
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
  if(G._waveLoopEnabled&&typeof _startWaveFlowNext==='function'){
    if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
    G._isShop=false; G._isForge=false; G._isVillageMenu=false; G._isTavern=false; G._isRingExchange=false; G._isItemShop=false;
    _startWaveFlowNext();
    return;
  }
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
// ══════════════════════════════════════════════════════════
// 街（村）専用画面
// ══════════════════════════════════════════════════════════
// 「地域情報」シートの1行（ステージ番号＝G._waveに対応）を返す。
function regionInfoForWave(wave){
  const w=Math.max(0,Number(wave)||0);
  const rows=(typeof window!=='undefined'&&window.REGION_INFO)||{};
  return rows[w]||null;
}
// 街の背景キー（Assets.backgrounds）。ステージ番号に対応させる。
function getVillageBackgroundKey(){
  // 塔（祭壇）は全ステージ共通でtower.png。
  if(G&&G._isWaveAltar) return 'tower';
  // ステージ0＝リーゼ（ゲーム開始地点）もそのままvillage0を使う。
  const wave=Math.max(0,Number(G&&G._wave)||0);
  return wave>=5?'villageEnd':`village${Math.min(4,wave)}`;
}
// 街ごとに背景の真上へ重ねる効果動画（未定義のステージは動画なし）。
// 値は文字列（既定レート0.3）または {src,rate}。
const VILLAGE_BG_VIDEOS={
  // 0（リーゼ）は動画なし。未定義のステージは_syncVillageBgVideo()が動画を止めて非表示にする。
  1:'assets/art/backgrounds/village_forest.webm',
  3:'assets/art/backgrounds/village_valley.webm',
  4:{src:'assets/art/backgrounds/city_capital.webm',rate:0.9}, // 雷は他の3倍速
};
// 塔（祭壇）は全ステージ共通。効果が薄いため layers:2 で同じ動画を2重に重ねる。
const TOWER_BG_VIDEO={src:'assets/art/backgrounds/tower.webm',rate:0.3,layers:2};
// 街×施設ごとの背景（Assets.backgroundsのキー）。未定義ならステージ背景のまま。
const VILLAGE_FACILITY_BG={
  1:{item:'itemShopForest',shop:'magicShopForest'},
  2:{item:'itemShopGrassland',shop:'magicShopGrassland',forge:'blacksmithGrassland'},
  3:{shop:'magicShopValley',forge:'blacksmithValley'},
};
// 施設画面（#scr-battle上の編成UI）の背景を、その街の施設専用画像へ差し替える。
// 編成画面（#scr-battle）の背景を専用画像で上書きする。編成画面は #scr-battle の
// background を丸ごと差し替えているため、--screen-bg-image ではなく専用の変数＋クラスを使う。
// assetKey=null で解除。
function _setOverrideBackground(assetKey){
  const body=document.body;
  if(!body) return;
  const path=assetKey&&typeof Assets!=='undefined'&&Assets.backgrounds?Assets.backgrounds[assetKey]:null;
  if(!path){
    body.classList.remove('facility-bg-active');
    body.style.removeProperty('--facility-bg-image');
    return;
  }
  body.style.setProperty('--facility-bg-image',`url("${path}")`);
  body.classList.add('facility-bg-active');
}
function _applyFacilityBackground(facKey){
  const wave=Math.max(0,Number(G&&G._wave)||0);
  _setOverrideBackground(facKey?((VILLAGE_FACILITY_BG[wave]||{})[facKey]||null):null);
}
// 街ごとのBGM（Assets.sfxのキー・再生開始位置・重ねる環境音）。未定義のステージはメニュー曲のまま。
// 開始位置は初回のみで、ループ2周目以降は曲の頭から鳴る。
const VILLAGE_BGM={
  0:{key:'villageStart',   startTime:83},  // リーゼ 1:23
  1:{key:'villageForest',  startTime:81},  // エルム 1:21
  2:{key:'villageGrassland',startTime:70}, // ヴァルガ 1:10
  3:{key:'villageValley',  startTime:75},  // ギャラハ 1:15
  4:{key:'cityCapital',    startTime:47}, // ヴォルザーク 0:47（雷＋雨はSTAGE_AMBIENCE側で持続再生）
  5:{key:'villageEndworld',startTime:110,sub:'bug'},     // フォルセティ 1:50＋虫
};
// 塔（祭壇）のBGM。全ステージ共通で1:37から。
const TOWER_BGM={key:'tower',startTime:97};
function _villageBgmSetting(){
  if(G&&G._isWaveAltar) return TOWER_BGM;
  const wave=Math.max(0,Number(G&&G._wave)||0);
  return VILLAGE_BGM[wave]||null;
}
// 街の環境音（複数可）。ambient0〜2の固定チャンネルへ割り当て、余りは止める。
const _AMBIENT_CHANNELS=['ambient0','ambient1','ambient2'];
function _applyVillageAmbience(subs){
  const list=Array.isArray(subs)?subs:(subs?[subs]:[]);
  _AMBIENT_CHANNELS.forEach((ch,i)=>{
    if(list[i]&&typeof playBgmLayer==='function') playBgmLayer(ch,list[i],{fadeInMs:1000});
    else if(typeof stopBgmLayer==='function') stopBgmLayer(ch,400);
  });
}
// ── ステージ持続環境音 ────────────────────────────────────
// 街の中だけでなく、そのステージの戦闘・報酬画面をまたいで鳴らし続ける環境音。
// stage0〜2の専用チャンネル（PERSISTENT_LAYER_CHANNELS）を使うため、
// 戦闘BGMへの切り替え（stopBgm）では止まらない。塔（祭壇）へ入った時点で止める。
//   fromStage … そのステージ番号（G._waveStage）以上で鳴らし始める。
//               stage1＝そのステージ最初の戦闘、stage4＝街。
const STAGE_AMBIENCE={
  // ステージ4：雷は最初の戦闘から、雨はヴォルザークに入ってから、どちらも塔まで止めない。
  4:[{key:'thunder',fromStage:1},{key:'rain',fromStage:4}],
};
// ステージ持続の効果動画。街だけでなく戦闘・報酬画面（#scr-battle）にも重ね続ける。
// 塔（祭壇）へ入った時点で止める。街画面側は VILLAGE_BG_VIDEOS が同じ動画を出す。
const STAGE_BG_VIDEOS={
  // ステージ4：ヴォルザークに入ってから蝕界の塔まで、雷を戦闘中も重ね続ける。
  4:{src:'assets/art/backgrounds/city_capital.webm',rate:0.9,fromStage:4},
};
function _stageAmbienceList(){
  if(!G) return [];
  if(G._isWaveAltar) return []; // 塔に入ったら止める
  const wave=Math.max(0,Number(G._wave)||0);
  const defs=STAGE_AMBIENCE[wave];
  if(!defs) return [];
  const stage=Math.max(1,Number(G._waveStage)||1);
  return defs.filter(d=>stage>=(d.fromStage||1)).map(d=>d.key);
}
function _stageBgVideoSetting(){
  if(!G||G._isWaveAltar) return null;
  const def=STAGE_BG_VIDEOS[Math.max(0,Number(G._wave)||0)];
  if(!def) return null;
  return (Math.max(1,Number(G._waveStage)||1)>=(def.fromStage||1))?def:null;
}
// #scr-battle側のステージ持続動画を現在の進行度に合わせる（同じsrcなら再読み込みしない）。
function _syncStageBgVideo(){
  const el=document.getElementById('stage-bg-video');
  if(!el) return;
  const def=_stageBgVideoSetting();
  if(!def){
    el.classList.remove('is-active');
    try{ el.pause(); }catch(_e){}
    el.removeAttribute('src');
    return;
  }
  if(el.getAttribute('src')!==def.src){
    el.setAttribute('src',def.src);
    el.load();
  }
  el.classList.add('is-active');
  el.muted=true;
  el.loop=true;
  el.playbackRate=def.rate||0.3;
  el.defaultPlaybackRate=def.rate||0.3;
  try{ void Promise.resolve(el.play()).catch(()=>{}); }catch(_e){}
}
// 現在のステージ／進行度に合うステージ持続環境音を鳴らし、不要なものを止める。
// 街・塔への入場と戦闘開始のたびに呼ぶ（すでに同じ音が鳴っていれば何もしない）。
function _syncStageAmbience(){
  _syncStageBgVideo();
  const list=_stageAmbienceList();
  const channels=(typeof PERSISTENT_LAYER_CHANNELS!=='undefined')?PERSISTENT_LAYER_CHANNELS:[];
  channels.forEach((ch,i)=>{
    if(list[i]&&typeof playBgmLayer==='function') playBgmLayer(ch,list[i],{fadeInMs:1200});
    else if(typeof stopBgmLayer==='function') stopBgmLayer(ch,700);
  });
}
// 動画1枚分の共通設定。同じsrcなら読み直さない（＝再生位置を維持する）。
function _applyBgVideoEl(el,src,rate){
  if(!el) return;
  if(!src){
    el.classList.remove('is-active');
    try{ el.pause(); }catch(_e){}
    el.removeAttribute('src');
    return;
  }
  if(el.getAttribute('src')!==src){
    el.setAttribute('src',src);
    el.load();
  }
  el.classList.add('is-active');
  el.muted=true;
  el.loop=true;
  el.playbackRate=rate;
  el.defaultPlaybackRate=rate;
  try{ void Promise.resolve(el.play()).catch(()=>{}); }catch(_e){}
}
function _syncVillageBgVideo(){
  const el=document.getElementById('village-bg-video');
  const el2=document.getElementById('village-bg-video-2');
  if(!el) return;
  // ステージ0（リーゼ）は動画なし。Math.max(1,…)にするとステージ1の動画を拾ってしまう。
  const wave=Math.max(0,Number(G&&G._wave)||0);
  const def=(G&&G._isWaveAltar)?TOWER_BG_VIDEO:(VILLAGE_BG_VIDEOS[wave]||'');
  const src=typeof def==='string'?def:(def&&def.src||'');
  const rate=(def&&typeof def==='object'&&Number(def.rate))||0.3;
  // layers:2 で同じ動画を2重に重ねる（screen合成が2回掛かり、薄い動画がはっきり見える）。
  const layers=(def&&typeof def==='object'&&Number(def.layers))||1;
  _applyBgVideoEl(el,src,rate);
  _applyBgVideoEl(el2,(src&&layers>=2)?src:'',rate);
  // 2枚目は1枚目と再生位置を合わせる（ずれると別々の明滅に見えて「2重」にならない）。
  if(el2&&src&&layers>=2) _syncBgVideoLayerTime(el,el2);
}
// 2枚目の再生位置を1枚目へ合わせ続ける。読み込み直後と、ずれが目立つ時だけ補正する
// （毎回代入するとシークが連続して再生がガタつくため）。
function _syncBgVideoLayerTime(el,el2){
  const align=()=>{
    if(!el2.classList.contains('is-active')) return;
    const d=Number(el.duration);
    if(!Number.isFinite(d)||d<=0) return;
    if(Math.abs(el2.currentTime-el.currentTime)>0.08){
      try{ el2.currentTime=el.currentTime; }catch(_e){}
    }
  };
  if(el2.readyState>=1) align();
  else el2.addEventListener('loadedmetadata',align,{once:true});
  if(_bgVideoLayerTimer) clearInterval(_bgVideoLayerTimer);
  _bgVideoLayerTimer=setInterval(()=>{
    if(!el2.classList.contains('is-active')){ clearInterval(_bgVideoLayerTimer); _bgVideoLayerTimer=null; return; }
    align();
  },2000);
}
let _bgVideoLayerTimer=null;
// 街のBGM。ステージ専用曲があればその開始位置から、無ければメニュー曲。
function playVillageBgm(fadeInMs){
  if(typeof playBgm!=='function') return;
  // 街のBGMは施設（ショップ／鍛治屋／道具屋）へ入っても止めず、menu.wavへも切り替えない。
  // このフラグが立っている間、goToReward()／showScreen()はBGMを触らない。
  G._villageBgmActive=true;
  // ステージ持続環境音（ステージ4の雷雨など）は街／塔の別に合わせて更新する。
  // 塔に入った場合は_stageAmbienceList()が空になり、ここで止まる。
  _syncStageAmbience();
  const cfg=_villageBgmSetting();
  if(!cfg){ playBgm('menu',{fadeInMs:fadeInMs??600}); return; }
  playBgm(cfg.key,{fadeInMs:fadeInMs??600,startTime:cfg.startTime||0});
  // 環境音（虫など）は曲の頭から重ねてループする（複数可）。
  _applyVillageAmbience(cfg.sub);
}
// 施設内で重ねる環境音（施設キー → Assets.sfxのキー）。街の環境音とは別チャンネルなので、
// ヴォルザークの雷などを止めずに上に重なる。
const FACILITY_AMBIENCE={ forge:'blacksmith' };
function _applyFacilityAmbience(facKey){
  const key=facKey?FACILITY_AMBIENCE[facKey]:null;
  if(!key){ if(typeof stopBgmLayer==='function') stopBgmLayer('facility',400); return; }
  if(typeof playBgmLayer==='function') playBgmLayer('facility',key,{fadeInMs:600});
}
// 塔（祭壇）のBGM。_villageBgmSetting()がTOWER_BGMを返すため実体はplayVillageBgm。
function playTowerBgm(fadeInMs){ playVillageBgm(fadeInMs); }
// シートの「街の施設」列に書かれる施設名 → 動作キー。
// 「鍛冶屋」はシート上の表記が「鍛治屋」の場合もあるため両方を登録する。
const VILLAGE_FACILITY_DEFS={
  'ホーム':   {key:'home'},
  '図書館':   {key:'library'},
  'ショップ': {key:'shop'},
  '魔導店':   {key:'shop'},
  '魔道店':   {key:'shop'},
  '道具屋':   {key:'item'},
  '鍛冶屋':   {key:'forge'},
  '鍛治屋':   {key:'forge'},
  '宿屋':     {key:'inn'},
  '広場':     {key:'plaza'},
  '酒場':     {key:'tavern'},
  // 塔の施設
  '祭壇':     {key:'ringExchange'},
  '踊り場':   {key:'landing'},
};
// 施設名の表記揺れ（鍛冶屋／鍛治屋、魔導店／魔道店、旧称ショップ）を吸収した候補名を返す。
function villageFacilityNameVariants(name){
  const out=[String(name||'')];
  const push=v=>{ if(v&&out.indexOf(v)<0) out.push(v); };
  out.slice().forEach(v=>{
    if(v.indexOf('鍛治')>=0) push(v.replace('鍛治','鍛冶'));
    if(v.indexOf('鍛冶')>=0) push(v.replace('鍛冶','鍛治'));
    if(v.indexOf('魔道')>=0) push(v.replace('魔道','魔導'));
    if(v.indexOf('魔導')>=0) push(v.replace('魔導','魔道'));
  });
  // 「ショップ」は「魔導店」へ改称済み。どちらの表記でも引けるようにする。
  if(out.some(v=>v==='魔導店'||v==='魔道店')) push('ショップ');
  if(out.indexOf('ショップ')>=0){ push('魔導店'); push('魔道店'); }
  return out;
}
// シートに行が無い施設用の予備テキスト（「テキストメッセージ」シートに
// 「街「◯◯」直下」行を追加すればそちらが優先される）。
const VILLAGE_FACILITY_FALLBACK_DESC={
  '道具屋':'アイテムの売買ができる。',
  '宿屋':'ライフを回復できる。',
  '広場':'クエストを受けることができる。',
  '闘技場':'腕試しができる。',
  // 塔（「テキストメッセージ」シートに塔「◯◯」直下の行が追加されればそちらが優先）
  '祭壇':'カード3枚と引き換えに指輪1つを得る。',
  '踊り場':'ひと息つける。',
};
// 施設ボタン直下の説明文は「テキストメッセージ」シートの「街「◯◯」直下」行から引く。
// シート内の表記揺れ（鍛冶屋／鍛治屋）に備えて両方の綴りで探す。
function villageFacilityDescText(name){
  const msgs=(typeof window!=='undefined'&&window.TEXT_MESSAGES)||{};
  const variants=villageFacilityNameVariants(name);
  // 塔の施設は「塔「◯◯」直下」、街の施設は「街「◯◯」直下」を参照する。
  const prefixes=(G&&G._isWaveAltar)?['塔','街']:['街','塔'];
  for(const pre of prefixes){
    for(const v of variants){
      const hit=msgs[`${pre}「${v}」直下`];
      if(hit) return String(hit);
    }
  }
  for(const v of variants){
    if(VILLAGE_FACILITY_FALLBACK_DESC[v]) return VILLAGE_FACILITY_FALLBACK_DESC[v];
  }
  return '';
}
// 施設ボタンの表示位置。まず施設名ごとの指定位置を使い、指定が無いものは
// 空いている汎用スロットへ順番に割り当てる。
const VILLAGE_FACILITY_POS=[
  {left:'20%',top:'58%'},
  {left:'50%',top:'71%'},
  {left:'79%',top:'58%'},
  {left:'50%',top:'42%'},
];
const VILLAGE_FACILITY_POS_BY_NAME={
};
// 街（ステージ）ごとの個別配置。{x,y}はゲームキャンバス座標での**左上合わせ**のpx指定
// （汎用スロットの{left,top}％指定は中心合わせ）。ここに書いた施設は共通指定より優先する。
// 鍛冶／鍛治・魔導／魔道の表記揺れは _villageFacilityFixedPos() 側で吸収する。
const VILLAGE_FACILITY_POS_BY_WAVE={
  // リーゼ（ゲーム開始地点）
  0:{
    'ホーム':  {x:461, y:993},
    '図書館':  {x:3237,y:993},
  },
  // エルム
  1:{
    '酒場':  {x:1770,y:516},
    '魔導店':{x:267, y:814},
    '道具屋':{x:3132,y:1020},
  },
  // ヴァルガ
  2:{
    '鍛冶屋':{x:3209,y:967},
    '魔導店':{x:2352,y:967},
    '道具屋':{x:756, y:1020},
    '宿屋':  {x:1231,y:814},
  },
  // ギャラハ
  3:{
    '鍛冶屋':{x:2481,y:487},
    '魔導店':{x:2826,y:899},
    '広場':  {x:486, y:1481},
  },
  // ヴォルザーク
  4:{
    '酒場':  {x:2485,y:1698},
    '魔導店':{x:3206,y:1100},
    '鍛冶屋':{x:335, y:1096},
  },
  // フォルセティ
  5:{
    '魔導店':{x:485, y:910},
    '宿屋':  {x:2723,y:839},
    '道具屋':{x:1198,y:972},
  },
};
// 塔の施設位置（全ステージ共通・左上合わせpx）。
const TOWER_FACILITY_POS={
  '祭壇':  {x:2260,y:246},
  '踊り場':{x:1621,y:1402},
};
// 施設名の表記揺れ（鍛冶屋／鍛治屋）を吸収して個別配置を引く。
function _villageFacilityFixedPos(name){
  const wave=Math.max(0,Number(G&&G._wave)||0);
  const table=(G&&G._isWaveAltar)?TOWER_FACILITY_POS:(VILLAGE_FACILITY_POS_BY_WAVE[wave]||null);
  const variants=villageFacilityNameVariants(name);
  if(table){
    for(const v of variants){ if(table[v]) return table[v]; }
  }
  for(const v of variants){ if(VILLAGE_FACILITY_POS_BY_NAME[v]) return VILLAGE_FACILITY_POS_BY_NAME[v]; }
  return null;
}
// facs：villageFacilityList()の結果。戻り値は同じ順の座標配列。
function _villageFacilityPositions(facs){
  const used=new Set();
  const fixed=facs.map(f=>{
    const p=_villageFacilityFixedPos(f.name);
    if(!p) return null;
    // 汎用スロットと同じ座標なら、そのスロットを使用済みにする（%指定同士のみ比較）。
    if(p.left!=null) VILLAGE_FACILITY_POS.forEach((q,i)=>{ if(q.left===p.left&&q.top===p.top) used.add(i); });
    return p;
  });
  let cursor=0;
  return fixed.map(p=>{
    if(p) return p;
    while(used.has(cursor)&&cursor<VILLAGE_FACILITY_POS.length) cursor++;
    const slot=VILLAGE_FACILITY_POS[Math.min(cursor,VILLAGE_FACILITY_POS.length-1)];
    used.add(cursor);
    cursor++;
    return slot;
  });
}
function villageFacilityList(){
  const info=regionInfoForWave(G&&G._wave);
  const raw=(G&&G._isWaveAltar)?(info&&info.towerFacilities):(info&&info.townFacilities);
  const names=String(raw||'').split(/[、,／\/]/).map(s=>s.trim()).filter(Boolean);
  if(!names.length&&G&&G._isWaveAltar) names.push('祭壇');
  return (names.length?names:['ショップ']).map(name=>{
    const def=VILLAGE_FACILITY_DEFS[name]||null;
    return {name,key:def?def.key:'none',desc:villageFacilityDescText(name)};
  });
}
function _villageInnUsed(){
  const used=G._waveInnUsed||{};
  return !!used[_waveFacilityCacheKey()];
}
function useVillageInn(){
  const life=Math.max(0,Math.min(3,G._waveLife==null?3:Number(G._waveLife)));
  if(_villageInnUsed()){ log('この街の宿屋はもう利用できない。','sys'); return; }
  if(life>=3){ log('ライフは満タンだ。','sys'); return; }
  if((G.gold||0)<500){ log('ゴールドが足りない。','bad'); return; }
  G.gold-=500;
  G._waveLife=life+1;
  G._waveInnUsed=G._waveInnUsed||{};
  G._waveInnUsed[_waveFacilityCacheKey()]=true;
  // 押下時にshop_in.wavを鳴らしているので、ここでは購入音を重ねない。
  log(`宿屋で休息した。ライフを1回復した（残り${G._waveLife}）。`,'good');
  if(typeof updateHUD==='function') updateHUD();
  renderVillageScreen();
}
// 宿屋は「ライフが減っている」「500G以上持っている」「この街で未利用」の全てを満たす時のみ押せる。
// 中身が未実装の施設。表示はするが選べない（暗くする）。
const VILLAGE_FACILITY_UNIMPLEMENTED=new Set(['home','library']);
function _villageFacilityDisabled(fac){
  if(!fac) return true;
  if(VILLAGE_FACILITY_UNIMPLEMENTED.has(fac.key)) return true;
  if(fac.key==='inn'){
    const life=Math.max(0,Math.min(3,G._waveLife==null?3:Number(G._waveLife)));
    return life>=3||_villageInnUsed()||(G.gold||0)<500;
  }
  // 祭壇は指輪取得後（resolved）も入場できる。中は指輪が消えて枠だけの状態になる
  // （_renderRingOfferCards()／body.ring-offer-resolved）。
  return false;
}
// ショップ／鍛冶屋／道具屋／宿屋のみ、押下時にknock.wavを鳴らし切ってから
// shop_in.wavの再生と画面遷移を行う。広場・酒場はどちらも鳴らさない。
const _VILLAGE_KNOCK_KEYS=new Set(['shop','forge','item','inn']);
async function _onVillageFacility(fac){
  if(!fac||_villageFacilityDisabled(fac)) return;
  // 入場演出中（ボタンがまだ見えていない間）は押せないようにする。
  if(G._villageIntroPlaying) return;
  if(G._villageFacilityBusy) return;
  if(_VILLAGE_KNOCK_KEYS.has(fac.key)){
    G._villageFacilityBusy=true;
    try{
      if(typeof playSfxAwait==='function') await playSfxAwait('knock',{group:'ui',guardMs:0});
      else if(typeof playSfx==='function') playSfx('knock',{group:'ui',guardMs:0});
    }finally{
      G._villageFacilityBusy=false;
    }
  }
  if(fac.key==='shop'||fac.key==='forge'||fac.key==='item'){
    // 施設は既存の編成画面（#scr-battle上の報酬UI）をそのまま使う。
    // 左上のラベルは「編成」ではなくシートに書かれた施設名にする。
    // shop_in.wavは各open〜関数側で鳴らす。
    G._facilityLabel=fac.name;
    document.body.classList.remove('village-screen-active');
    if(typeof showScreen==='function') showScreen('battle');
    if(fac.key==='shop') openMapShop();
    else if(fac.key==='forge') openMapForge();
    else openMapItemShop();
    // showScreen('battle')でステージ背景に戻るため、施設専用背景は入店処理の後に適用する。
    _applyFacilityBackground(fac.key);
    _applyFacilityAmbience(fac.key);
    return;
  }
  if(fac.key==='ringExchange'){
    // 祭壇：既存の指輪交換画面（編成UI）へ。背景は塔のままtower.pngを維持する。
    G._facilityLabel=fac.name;
    document.body.classList.remove('village-screen-active');
    if(typeof showScreen==='function') showScreen('battle');
    openMapRingExchange();
    _setOverrideBackground('tower');
    _applyFacilityAmbience(null);
    return;
  }
  if(fac.key==='inn'){
    if(typeof playSfx==='function') playSfx('shopIn',{group:'ui'});
    useVillageInn();
    return;
  }
  // 広場（クエスト受託相当）・酒場・踊り場は表示のみ。SEも鳴らさない。
  log(`${fac.name}は未実装です。`,'sys');
}
// ══════════════════════════════════════════════════════════
// ワールドマップ画面（出発時に数秒だけ表示してから戦闘へ移行する）
// ══════════════════════════════════════════════════════════
// ui/map_line/N.svg の配置（左上合わせ・ゲームキャンバス座標）と、
// 移動方向（lr=左から右／rl=右から左／bt=下から上／tb=上から下）。
// w/h は各SVGのviewBox寸法。
const WORLD_MAP_LINES=[
  {n:1,x:1142,y:1424,w:616.28, h:281.81,dir:'rl'},
  {n:2,x:618, y:1276,w:181.53, h:181.58,dir:'bt'},
  {n:3,x:745, y:1020,w:894.21, h:166.96,dir:'lr'},
  {n:4,x:1965,y:1292,w:1218.57,h:98.97, dir:'lr'},
  {n:5,x:3219,y:990, w:270.39, h:286.18,dir:'bt'},
  {n:6,x:2850,y:466, w:305.05, h:397.28,dir:'bt'},
  {n:7,x:2385,y:470, w:658.46, h:261,   dir:'rl'},
  {n:8,x:2059,y:488, w:292.25, h:165.67,dir:'rl'},
];
// 現在地マーク（ui/map_mark.svg、左上合わせのpx座標）。キーは worldMapActiveLine() の戻り値。
// 2＝エルム後／3＝碧翠の塔後／4＝ヴァルガ後／5＝雷鳴の塔後／6＝ギャラハ後／
// 7＝赤禍の塔後／8＝ヴォルザーク後／0＝蝕界の塔後（ラインのアニメーションは行わない）。
const WORLD_MAP_MARK_W=50, WORLD_MAP_MARK_H=170.88;
const WORLD_MAP_MARKS={
  2:{x:666, y:847},
  3:{x:1977,y:877},
  4:{x:3189,y:897},
  5:{x:2959,y:715},
  6:{x:3030,y:72},
  7:{x:2333,y:327},
  8:{x:2048,y:293},
  0:{x:559, y:321},
};
// 現在移動中のライン番号（1〜8）。0なら全て到達済み扱い。
// ステージ（=G._wave）ごとに「村まで」「塔まで」の2本ずつ進む。
// stageが5以上＝村を出て塔へ向かっている区間。
function worldMapActiveLine(wave,stage){
  const w=Math.max(1,Number(wave)||1);
  if(w>=5) return 0;
  const toTower=(Number(stage)||1)>=5;
  return Math.min(8,(w-1)*2+(toTower?2:1));
}
function renderWorldMapScreen(activeOverride){
  const info=regionInfoForWave(G&&G._wave);
  const name=String((info&&info.townName)||'街');
  const split=name.match(/^(.*?)[ 　]+(.+)$/);
  const sub=document.getElementById('map-name-sub');
  const main=document.getElementById('map-name-main');
  if(sub) sub.textContent=split?split[1]:'';
  if(main) main.textContent=split?split[2]:name;
  const gold=document.getElementById('map-gold');
  if(gold){
    const shown=typeof goldDisplayValue==='function'?goldDisplayValue():(Number(G.gold)||0);
    gold.textContent=Number(shown).toLocaleString('ja-JP');
  }
  const lifeEl=document.getElementById('map-life');
  if(lifeEl){
    const life=Math.max(0,Math.min(3,G._waveLife==null?3:Number(G._waveLife)));
    lifeEl.innerHTML=`${Array.from({length:3-life},()=>'<span class="battle-life-heart battle-life-heart-empty">♡</span>').join('')}${Array.from({length:life},()=>'<span class="battle-life-heart battle-life-heart-filled">♥</span>').join('')}`;
  }
  const host=document.getElementById('map-lines');
  if(!host) return;
  const active=Number.isInteger(activeOverride)?activeOverride:worldMapActiveLine(G&&G._wave,G&&G._waveStage);
  host.innerHTML='';
  WORLD_MAP_LINES.forEach(def=>{
    // 現在地より先のラインはまだ描かない。
    if(active>0&&def.n>active) return;
    const el=document.createElement('div');
    el.className=`map-line ${def.n===active?`is-active dir-${def.dir}`:'is-done'}`;
    el.style.left=`${def.x}px`;
    el.style.top=`${def.y}px`;
    el.style.width=`${def.w}px`;
    el.style.height=`${def.h}px`;
    el.style.setProperty('--map-line-img',`url("assets/ui/map_line/${def.n}.svg")`);
    host.appendChild(el);
  });
  // 現在地マーク：発光しながら上下に揺れる。
  const mark=WORLD_MAP_MARKS[active];
  if(mark){
    const m=document.createElement('div');
    m.className='map-mark';
    m.style.left=`${mark.x}px`;
    m.style.top=`${mark.y}px`;
    m.style.width=`${WORLD_MAP_MARK_W}px`;
    m.style.height=`${WORLD_MAP_MARK_H}px`;
    host.appendChild(m);
  }
}
// 街を出る → マップ画面を数秒表示 → フェードアウトして戦闘へ。
async function _playWorldMapDeparture(done){
  if(G._worldMapScreenPlaying){ done(); return; }
  G._worldMapScreenPlaying=true;
  const fade=_ensureVillageEnterFadeEl();
  try{
    fade.style.transition='opacity .34s ease';
    fade.style.opacity='1';
    await _mapDelay(360);
    // マップは「これから向かう区間」を光らせる。
    // 村（stage4）を出た直後＝塔へ向かう区間、塔（stage10）を出た直後＝次のステージの街へ向かう区間。
    let nextWave=Math.max(1,Number(G._wave)||1);
    let nextStage=Number(G._waveStage)||1;
    // リーゼ（ステージ0）を出た直後はステージ1の最初の戦闘へ向かう区間。
    if(Number(G._wave)===0){ nextWave=1; nextStage=1; }
    else if(nextStage===4) nextStage=5;
    else if(nextStage===10){ nextWave=Math.min(5,nextWave+1); nextStage=1; }
    renderWorldMapScreen(worldMapActiveLine(nextWave,nextStage));
    if(typeof showScreen==='function') showScreen('map');
    fade.style.transition='opacity .5s ease';
    fade.style.opacity='0';
    await _mapDelay(3200);
    fade.style.transition='opacity .5s ease';
    fade.style.opacity='1';
    await _mapDelay(520);
  }finally{
    G._worldMapScreenPlaying=false;
  }
  done();
  // 村・塔の入場演出へ入った場合は暗転をそのまま演出側へ引き継ぐ。
  // ここで明転すると、演出が黒を掛け直すまでの間だけマップがもう一度見えてしまう。
  if(G._villageIntroPlaying) return;
  await _mapDelay(80);
  fade.style.transition='opacity .45s ease';
  fade.style.opacity='0';
}
// ── 出発時のムービー ─────────────────────────────────────
// ワールドマップの代わりにムービーを流すステージ（キー＝G._wave。街のみ・塔は対象外）。
const DEPARTURE_MOVIES={
  5:'assets/movie/movie1.webm', // フォルセティ → 最終決戦へ
};
function _departureMovieSrc(){
  if(!G||G._isWaveAltar) return '';
  return DEPARTURE_MOVIES[Math.max(0,Number(G._wave)||0)]||'';
}
function _ensureCutsceneVideoEl(){
  let el=document.getElementById('cutscene-video');
  if(!el){
    el=document.createElement('video');
    el.id='cutscene-video';
    el.setAttribute('playsinline','');
    el.setAttribute('preload','auto');
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
  }
  return el;
}
// 暗転 → ムービー全画面再生 → 再生完了で暗転 → done()（次の戦闘へ）→ 明転。
// 再生できない／終わらない場合に進行が止まらないよう、安全弁のタイムアウトを必ず張る。
async function _playDepartureMovie(src,done){
  if(G._departureMoviePlaying){ done(); return; }
  G._departureMoviePlaying=true;
  const fade=_ensureVillageEnterFadeEl();
  const video=_ensureCutsceneVideoEl();
  try{
    fade.style.transition='opacity .34s ease';
    fade.style.opacity='1';
    await _mapDelay(360);
    if(video.getAttribute('src')!==src){
      video.setAttribute('src',src);
      video.load();
    }
    video.currentTime=0;
    video.loop=false;
    // デバッグミュート（SFX_SETTINGS.masterVolume=0）に追従する。
    const master=(typeof SFX_SETTINGS!=='undefined'&&Number(SFX_SETTINGS.masterVolume));
    video.muted=!(master>0);
    video.volume=Math.max(0,Math.min(1,Number.isFinite(master)?master:1));
    video.classList.add('is-active');
    const ended=new Promise(resolve=>{
      let settled=false;
      const finish=()=>{ if(settled) return; settled=true; resolve(); };
      video.addEventListener('ended',finish,{once:true});
      video.addEventListener('error',finish,{once:true});
      // 尺が分かり次第それに合わせ、分からない場合も30秒で必ず抜ける。
      const guard=()=>{
        const dur=Number(video.duration);
        window.setTimeout(finish,Number.isFinite(dur)&&dur>0?dur*1000+1500:30000);
      };
      if(video.readyState>=1) guard();
      else video.addEventListener('loadedmetadata',guard,{once:true});
    });
    try{ await Promise.resolve(video.play()); }catch(_e){}
    fade.style.transition='opacity .5s ease';
    fade.style.opacity='0';
    await ended;
    fade.style.transition='opacity .5s ease';
    fade.style.opacity='1';
    await _mapDelay(520);
  }finally{
    try{ video.pause(); }catch(_e){}
    video.classList.remove('is-active');
    G._departureMoviePlaying=false;
  }
  done();
  // マップ側と同様、入場演出に入ったら暗転は演出側へ引き継ぐ。
  if(G._villageIntroPlaying) return;
  await _mapDelay(80);
  fade.style.transition='opacity .45s ease';
  fade.style.opacity='0';
}
// 街・塔の「出発する」共通処理。BGMを落としてマップ画面（またはムービー）を挟んでから次へ進む。
function departWithWorldMap(){
  if(G._pendingPanelPlacement) return;
  G._villageBgmActive=false;
  if(typeof stopBgm==='function') stopBgm(900);
  const next=()=>{ if(typeof shopDone==='function') shopDone(); };
  const movie=_departureMovieSrc();
  if(movie){ void _playDepartureMovie(movie,next); return; }
  void _playWorldMapDeparture(next);
}
function villageDepart(){
  if(G._pendingPanelPlacement) return;
  if(G._villageIntroPlaying) return;
  document.body.classList.remove('village-screen-active');
  if(typeof playSfx==='function') playSfx('menuClose',{group:'ui'});
  departWithWorldMap();
}
function renderVillageScreen(){
  const info=regionInfoForWave(G&&G._wave);
  const name=(G&&G._isWaveAltar)
    ?String((info&&info.towerName)||'塔')
    :String((info&&info.townName)||'街');
  // 「大樹の抱く集落 エルム」のように半角スペース区切りなら、前半（地域名）を小さく表示する。
  const split=name.match(/^(.*?)[ 　]+(.+)$/);
  const sub=document.getElementById('village-name-sub');
  const main=document.getElementById('village-name-main');
  if(sub) sub.textContent=split?split[1]:'';
  if(main) main.textContent=split?split[2]:name;
  // 所持金／ライフは戦闘画面の #battle-status-hud と同じ表記に合わせる。
  const gold=document.getElementById('village-gold');
  if(gold){
    const shown=typeof goldDisplayValue==='function'?goldDisplayValue():(Number(G.gold)||0);
    gold.textContent=Number(shown).toLocaleString('ja-JP');
  }
  const lifeEl=document.getElementById('village-life');
  if(lifeEl){
    const life=Math.max(0,Math.min(3,G._waveLife==null?3:Number(G._waveLife)));
    lifeEl.innerHTML=`${Array.from({length:3-life},()=>'<span class="battle-life-heart battle-life-heart-empty">♡</span>').join('')}${Array.from({length:life},()=>'<span class="battle-life-heart battle-life-heart-filled">♥</span>').join('')}`;
  }
  const host=document.getElementById('village-facilities');
  if(host){
    host.innerHTML='';
    const facs=villageFacilityList();
    const positions=_villageFacilityPositions(facs);
    facs.forEach((fac,i)=>{
      const pos=positions[i]||VILLAGE_FACILITY_POS[i%VILLAGE_FACILITY_POS.length];
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='village-facility';
      btn.dataset.sfxSilent='1';
      if(pos&&pos.x!=null){
        // px指定は左上合わせ（中心合わせのtranslateを打ち消す）。
        btn.classList.add('village-facility-topleft');
        btn.style.left=`${pos.x}px`;
        btn.style.top=`${pos.y}px`;
      }else{
        btn.style.left=pos.left;
        btn.style.top=pos.top;
      }
      if(_villageFacilityDisabled(fac)) btn.classList.add('village-facility-disabled');
      btn.innerHTML=`<span class="village-facility-name">${fac.name}</span>${fac.desc?`<span class="village-facility-desc">${fac.desc}</span>`:''}`;
      btn.onclick=()=>_onVillageFacility(fac);
      host.appendChild(btn);
    });
  }
  const depart=document.getElementById('village-depart-btn');
  if(depart) depart.onclick=villageDepart;
  // デバッグモードでは街にもミュートボタンを出す（オプションボタンの直下）。
  const mute=document.getElementById('village-mute-btn');
  if(mute){
    mute.style.display=(G&&G._debugMode)?'block':'none';
    mute.textContent=(typeof isDebugMuted==='function'&&isDebugMuted())?'🔇':'🔊';
    mute.onclick=()=>{ if(typeof toggleDebugMute==='function') toggleDebugMute(); };
  }
  // デバッグモードでは、ミュートボタンの下に編成画面を開くボタンを出す。
  const form=document.getElementById('village-formation-btn');
  if(form){
    form.style.display=(G&&G._debugMode)?'block':'none';
    form.onclick=()=>{ if(typeof debugOpenFormation==='function') debugOpenFormation(); };
  }
  _syncVillageBgVideo();
}
// 街への入場演出。①画面を黒へフェードアウト → ②村の背景だけを中央から円形にフェードイン
// → ③途中から地域名＋下線（白）をフェードイン → ④消えきってから背景以外の要素をフェードイン。
function _ensureVillageEnterFadeEl(){
  let el=document.getElementById('village-enter-fade');
  if(!el){
    el=document.createElement('div');
    el.id='village-enter-fade';
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
  }
  return el;
}
async function _playVillageEnterIntro(build){
  if(G._villageIntroPlaying){ build(); return; }
  G._villageIntroPlaying=true;
  const body=document.body;
  const fade=_ensureVillageEnterFadeEl();
  // エリート／ボス戦後などで既に画面が暗転している場合は、その暗転をそのまま引き継ぐ。
  // ここで改めて自前の暗転をやり直すと、戦闘側の黒が外れてから村の黒が乗るまでの間に
  // 一瞬だけ盤面が見えてしまう（continueAfterBattleVictory側も演出中は黒を外さない）。
  const battleFades=['battle-end-fade','battle-transition-fade']
    .map(id=>document.getElementById(id))
    .filter(el=>el&&el.classList.contains('is-visible'));
  // ワールドマップ／ムービーからの遷移では#village-enter-fade自体が既に真っ黒。
  // これを見ずにopacity:0へ戻すと、マップが一瞬もう一度見えてしまう。
  const fadeOpacity=Number(getComputedStyle(fade).opacity);
  const alreadyBlack=battleFades.length>0||(Number.isFinite(fadeOpacity)&&fadeOpacity>=0.99);
  try{
    // ① いま表示している画面を黒へフェードアウト（BGMも一緒に落とす）
    if(typeof stopBgm==='function') stopBgm(320);
    fade.style.transition='none';
    fade.style.opacity=alreadyBlack?'1':'0';
    if(!alreadyBlack){
      void fade.offsetWidth;
      fade.style.transition='opacity .34s ease';
      fade.style.opacity='1';
      await _mapDelay(360);
    }
    // ② 村画面へ切り替える（背景以外は隠したまま構築する）
    body.classList.add('village-intro-active','village-intro-hide-ui');
    build();
    // 戦闘側の黒オーバーレイは、村の黒に置き換わったこの時点で外す。
    battleFades.forEach(el=>{ el.classList.remove('is-visible','is-final'); el.removeAttribute('style'); });
    // ③ 黒は即座に外し、背景を中央から円形にフェードインさせる
    fade.style.transition='none';
    fade.style.opacity='0';
    body.classList.remove('village-intro-circle');
    void body.offsetWidth;
    body.classList.add('village-intro-circle');
    // ④ 円形フェードインの途中で地域名＋下線をフェードイン
    await _mapDelay(340);
    const title=document.getElementById('village-intro-title');
    const info=regionInfoForWave(G&&G._wave);
    const introName=(G&&G._isWaveAltar)
      ?String((info&&info.towerName)||'塔')
      :String((info&&info.townName)||'街');
    // 半角/全角スペースで分割し、前半（地域名）を小さく上に、後半（固有名）を大きく下に出す。
    const introSplit=introName.match(/^(.*?)[ 　]+(.+)$/);
    const subEl=title&&title.querySelector('.village-intro-name-sub');
    const mainEl=title&&title.querySelector('.village-intro-name-main');
    if(subEl) subEl.textContent=introSplit?introSplit[1]:'';
    if(mainEl) mainEl.textContent=introSplit?introSplit[2]:introName;
    if(title){
      title.classList.remove('is-hiding');
      title.classList.add('is-visible');
    }
    // 文字の表示と同時にboom.wavを鳴らす。
    if(typeof playSfx==='function') playSfx('boom',{group:'ui',guardMs:0});
    // 地域名と下線が完全に表示された時点（#village-intro-title.is-visible の
    // opacity transition = .5s の完了時）から街のBGMを鳴らし始める。
    await _mapDelay(500);
    playVillageBgm(600);
    await _mapDelay(800);
    // ⑤ 地域名＋下線をフェードアウト
    if(title){
      title.classList.remove('is-visible');
      title.classList.add('is-hiding');
    }
    await _mapDelay(440);
    if(title) title.classList.remove('is-hiding');
    // ⑥ 完全に消えたら背景以外の要素をフェードイン
    body.classList.remove('village-intro-hide-ui');
    body.classList.add('village-intro-reveal-ui');
    await _mapDelay(440);
  }finally{
    body.classList.remove('village-intro-active','village-intro-circle','village-intro-hide-ui','village-intro-reveal-ui');
    fade.style.transition='none';
    fade.style.opacity='0';
    G._villageIntroPlaying=false;
  }
}
// options.intro：戦闘や別Sceneから新しく街へ入る場合はtrue（入場演出を再生する）。
// 施設から「店を出る」で戻る場合はfalse（演出なしで即表示）。
// options.tower：塔（祭壇）として開く。背景・BGM・施設一覧・名前が塔仕様になる。
function openMapVillage(options){
  if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
  G._mapReturnAfterReward=true;
  // 村メニューでは祭壇状態を必ず解除する（塔として開く場合のみ立てる）。
  G._isWaveAltar=!!(options&&options.tower);
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isItemShop=false;
  G._isVillageMenu=true;
  G._isTreasureMapReward=false;
  G._isRingExchange=false;
  G._facilityLabel='';
  G.phase='reward';
  // 街は編成画面ではなく専用画面。goToReward()を通さないためmenu_open.wavは鳴らない。
  const build=()=>{
    _applyFacilityBackground(null);
    _applyFacilityAmbience(null);
    document.body.classList.remove('world-map-active','reward-screen-active','shop-screen-active','forge-screen-active','item-shop-active','ring-offer-phase','ring-offer-resolved','treasure-offer-phase');
    document.body.classList.add('village-screen-active');
    if(typeof showScreen==='function') showScreen('village');
    renderVillageScreen();
  };
  if(options&&options.intro){ void _playVillageEnterIntro(build); return; }
  build();
}
// 道具屋：アイテム3つを提示（価格＝レアリティ×180）。手持ちアイテムの売却も可能（レアリティ×45）。
function _itemShopBuyPrice(card){
  return Math.max(1,Math.min(5,Number(card&&card.rarity)||1))*180;
}
function _itemShopSellPrice(card){
  return Math.max(1,Math.min(5,Number(card&&card.rarity)||1))*45;
}
function openMapItemShop(){
  // 施設の在庫・提示内容は「この施設に入った時点のステージ」に紐づけて保存する。
  // 保存時にG._waveを読むと、デバッグのステージジャンプのように
  // 「G._waveを書き換えてから編成画面を開く」経路で移動先のキーへ上書きしてしまう。
  G._facilityCacheKey=_waveFacilityCacheKey();
  G._mapReturnAfterReward=true;
  // 価格バッジ・購入処理はショップ機構をそのまま使うため_isShopも立てる。
  G._isShop=true;
  G._isItemShop=true;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G._isRingExchange=false;
  G._freeRewardPanelMode=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  if(typeof playSfx==='function') playSfx('shopIn',{group:'ui'});
  const waveKey=G._waveLoopEnabled?_waveFacilityCacheKey():null;
  if(waveKey!=null&&G._waveItemShopStock&&Array.isArray(G._waveItemShopStock[waveKey])){
    // 購入済みの枠はnullのまま「売切」として残す（詰めない・補充しない）。
    _rewCards=clone(G._waveItemShopStock[waveKey]);
  }else{
    const items=(typeof drawItems==='function'?drawItems(3):[]).filter(Boolean);
    items.forEach(it=>{ it._buyPrice=_itemShopBuyPrice(it); });
    _rewCards=items;
    if(waveKey!=null){ G._waveItemShopStock=G._waveItemShopStock||{}; G._waveItemShopStock[waveKey]=clone(_rewCards); }
  }
  while(_rewCards.length<3) _rewCards.push(null);
  G._isShop=true;
  G._isItemShop=true;
  G._freeRewardPanelMode=false;
  _rewFreePickDone=false;
  renderRewCards();
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderHandEditor();
  renderMoveSlotsInEnemy();
}
// 祭壇（wave進行stage10）：指輪交換を選択できるメニュー。
// 塔（祭壇）画面。村と全く同じ形式（#scr-village）で開く。
// 指輪交換の「祭壇から出る」からもここへ戻ってくる。
function _openWaveAltarMenu(){
  openMapVillage({tower:true});
}
function _mapSalePrice(card){
  const r=Math.max(1,Math.min(5,Number(card&&card.rarity)||1));
  return ({1:80,2:160,3:320,4:560,5:800})[r]||80;
}
function _mapPickSaleCard(pred, used){
  ensurePanelSaleStock();
  const pool=(PANEL_POOL||[]).filter(p=>p&&p.id&&_isImplementedPoolCard(p)&&!p._rewardExcluded&&!p._shopExcluded&&p.rarity!==-1&&panelSaleStockCount(p)>0&&!used.has(p.id)&&pred(p));
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
  // 施設の在庫・提示内容は「この施設に入った時点のステージ」に紐づけて保存する。
  // 保存時にG._waveを読むと、デバッグのステージジャンプのように
  // 「G._waveを書き換えてから編成画面を開く」経路で移動先のキーへ上書きしてしまう。
  G._facilityCacheKey=_waveFacilityCacheKey();
  G._mapReturnAfterReward=true;
  G._isShop=true;
  G._isItemShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G._freeRewardPanelMode=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  if(typeof playSfx==='function') playSfx('shopIn',{group:'ui'});
  const node=_mapCurrentVillageNode();
  const waveKey=G._waveLoopEnabled?_waveFacilityCacheKey():null;
  const shopAllowed=card=>{
    if(!card) return false;
    const def=(PANEL_POOL||[]).find(p=>p&&((card.id&&p.id===card.id)||(!card.id&&p.name===card.name)))||card;
    return _isImplementedPoolCard(def)&&!def._shopExcluded&&!card._shopExcluded;
  };
  // 購入済みの枠はnullのまま「売切」として残す（詰めない・補充しない）ため、
  // filterで落とさずmapでnull化する（＝配列長と位置を保つ）。
  const shopSlot=card=>(card&&shopAllowed(card))?card:null;
  if(node&&Array.isArray(node.shopStock)){
    _rewCards=clone(node.shopStock||[]).map(shopSlot);
  }else if(waveKey!=null&&G._waveShopStock&&Array.isArray(G._waveShopStock[waveKey])){
    _rewCards=clone(G._waveShopStock[waveKey]).map(shopSlot);
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
    if(waveKey!=null){ G._waveShopStock=G._waveShopStock||{}; G._waveShopStock[waveKey]=clone(_rewCards); }
  }
  // 一度売れた枠は補充しない（再入店しても同じ品揃え＝売切のまま）。
  while(_rewCards.length<5) _rewCards.push(null);
  G._isShop=true;
  G._freeRewardPanelMode=false;
  _rewFreePickDone=false;
  renderRewCards();
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderHandEditor();
  renderMoveSlotsInEnemy();
}
function openMapForge(){
  // 施設の在庫・提示内容は「この施設に入った時点のステージ」に紐づけて保存する。
  // 保存時にG._waveを読むと、デバッグのステージジャンプのように
  // 「G._waveを書き換えてから編成画面を開く」経路で移動先のキーへ上書きしてしまう。
  G._facilityCacheKey=_waveFacilityCacheKey();
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isItemShop=false;
  G._isForge=true;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  if(typeof playSfx==='function') playSfx('shopIn',{group:'ui'});
  _rewCards=[];
  _rewFreePickDone=true;
  const node=_mapCurrentVillageNode();
  const waveKey=G._waveLoopEnabled?_waveFacilityCacheKey():null;
  if(node&&Array.isArray(node.forgeOffers)){
    G._mapForgeOffers=clone(node.forgeOffers||[]);
  }else if(waveKey!=null&&G._waveForgeOffers&&Array.isArray(G._waveForgeOffers[waveKey])){
    G._mapForgeOffers=clone(G._waveForgeOffers[waveKey]);
  }else{
    G._mapForgeOffers=_pickMapForgeOffers();
    if(node) node.forgeOffers=clone(G._mapForgeOffers||[]);
    if(waveKey!=null){ G._waveForgeOffers=G._waveForgeOffers||{}; G._waveForgeOffers[waveKey]=clone(G._mapForgeOffers||[]); }
  }
  renderMapForgeOffers();
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderMoveSlotsInEnemy();
}
// wave進行中の村/祭壇施設（ショップ・鍛冶屋・指輪交換）は、同一waveの間は
// 提示内容を再抽選しない（一度戻って再訪しても同じ内容を保つ）。waveごとにキャッシュする。
function _waveFacilityCacheKey(){ return Math.max(0,Number(G._wave)||0); }
function _syncWaveFacilityCache(){
  if(!G._waveLoopEnabled) return;
  // 施設に入った時点のキー（G._facilityCacheKey）を優先する。理由はopenMap*()のコメント参照。
  const key=Number(G._facilityCacheKey)||_waveFacilityCacheKey();
  if(G._isItemShop){
    G._waveItemShopStock=G._waveItemShopStock||{};
    G._waveItemShopStock[key]=clone(_rewCards||[]);
  }else if(G._isShop){
    G._waveShopStock=G._waveShopStock||{};
    G._waveShopStock[key]=clone(_rewCards||[]);
  }else if(G._isForge){
    G._waveForgeOffers=G._waveForgeOffers||{};
    G._waveForgeOffers[key]=clone(G._mapForgeOffers||[]);
  }else if(G._isRingExchange){
    G._waveRingExchange=G._waveRingExchange||{};
    G._waveRingExchange[key]={
      offer:clone(G._ringOffer||[]),
      unlocked:!!G._ringOfferUnlocked,
      resolved:!!G._ringOfferResolved,
      discardCount:G._boardDiscardCount||0
    };
  }
}
// 祭壇の「指輪交換」：指輪3つを提示し、魔導板のカード3枚と引き換えに1つを選んで得る
// （既存のボス撃破後「栄光の力」画面の仕組み＝_ringOfferPhase系をそのまま再利用する）。
function openMapRingExchange(){
  // 施設の在庫・提示内容は「この施設に入った時点のステージ」に紐づけて保存する。
  // 保存時にG._waveを読むと、デバッグのステージジャンプのように
  // 「G._waveを書き換えてから編成画面を開く」経路で移動先のキーへ上書きしてしまう。
  G._facilityCacheKey=_waveFacilityCacheKey();
  G._mapReturnAfterReward=true;
  G._isShop=false;
  G._isItemShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G._isRingExchange=true;
  G._isWaveAltar=true;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  if(typeof playSfx==='function') playSfx('altarIn',{group:'ui'});
  const waveKey=_waveFacilityCacheKey();
  const cache=G._waveRingExchange&&G._waveRingExchange[waveKey];
  if(cache){
    G._ringOffer=clone(cache.offer||[]);
    G._ringOfferUnlocked=!!cache.unlocked;
    G._ringOfferResolved=!!cache.resolved;
    G._boardDiscardCount=cache.discardCount||0;
  }else{
    G._ringOffer=typeof _pickRingOffer==='function'?_pickRingOffer():[];
    // 初めて入る祭壇では解放状態を必ず初期化する。前の塔で指輪を取った
    // （_ringOfferResolved=true）まま持ち越すと、新しい祭壇でも「取得済み」扱いになり
    // 指輪が出ず空の枠だけが表示されてしまう。
    G._ringOfferUnlocked=false;
    G._ringOfferResolved=false;
    G._ringOfferFadeOut=null;
    G._boardDiscardCount=0;
    G._waveRingExchange=G._waveRingExchange||{};
    G._waveRingExchange[waveKey]={offer:clone(G._ringOffer||[]),unlocked:false,resolved:false,discardCount:0};
  }
  G._ringOfferPhase=true;
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  renderRewCards();
  renderMoveSlotsInEnemy();
  renderHandEditor();
  renderFieldEditor();
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
    btn.disabled=!!G._mapForgeAnimating||(G.gold||0)<power.price||!_mapForgeCandidateSlots(power).length;
    btn.onclick=async()=>{
      if(btn.disabled) return;
      await applyPendingMapForgePower(power);
    };
    row.appendChild(btn);
  });
  renderHandEditor();
}
function _mapPanelPowerIdAtSafe(slotIdx){
  if(typeof mapPanelPowerIdAt==='function') return mapPanelPowerIdAt(slotIdx);
  return String(G&&G.mapPanelPowers&&G.mapPanelPowers[slotIdx]||'');
}
function _mapForgeCandidateSlots(power){
  if(!power) return [];
  const size=typeof MAIN_BOARD_SIZE!=='undefined'?MAIN_BOARD_SIZE:15;
  if(power.id==='summon'){
    // 召喚の力は、特殊マスではない上段・下段だけを対象にする。
    // ■□■□■ / ■■■■■ / □■□■□
    return [0,2,4,11,13].filter(i=>i<size&&!_mapPanelPowerIdAtSafe(i));
  }
  return Array.from({length:size},(_,i)=>i).filter(i=>_mapPanelPowerIdAtSafe(i)==='summon');
}
// カードのフェードアウト後の演出。召喚の力＝board_change1、それ以外＝board_change2の
// webp＋SFXを再生する（旧ルーレット演出は廃止）。
// targetSlotIdx：VFXを重ねる対象マス（実際に変化するマスと必ず一致させる）。
// onMidpoint：VFX開始から0.5秒後に呼ばれる（マスの画像を変化後へ差し替えるため）。
async function _playMapBoardChangeVfx(isSummon,targetSlotIdx,onMidpoint){
  const webpUrl=isSummon?'assets/vfx/board_change1.webp':'assets/vfx/board_change2.webp';
  // board_change2.wavは未配置のため、召喚以外でも無音にならないようboard_change1.wavへ
  // フォールバックする（専用音源が追加されたら下の候補順の先頭が自動的に使われる）。
  const sfxCandidates=isSummon
    ?['assets/sfx/board_change1.wav']
    :['assets/sfx/board_change2.wav','assets/sfx/board_change1.wav'];
  (function playFirstAvailable(i){
    if(i>=sfxCandidates.length) return;
    // errorイベントとplay()のreject（同じ読み込み失敗で両方起こりうる）で
    // フォールバックが二重に走り音が重なるのを防ぐ。
    let advanced=false;
    const next=()=>{ if(advanced) return; advanced=true; playFirstAvailable(i+1); };
    try{
      const se=(typeof playFileSfx==='function')?playFileSfx(sfxCandidates[i]):null;
      if(se&&se.addEventListener){ se.addEventListener('error',next,{once:true}); }
      else if(!se){
        const fb=new Audio(sfxCandidates[i]);
        fb.volume=.85;
        fb.addEventListener('error',next,{once:true});
        void Promise.resolve(fb.play()).catch(next);
      }
    }catch(_e){ next(); }
  })(0);
  const slotEl=Number.isInteger(targetSlotIdx)
    ?document.querySelector(`#hand-slots.unit-equip-slots > :nth-child(${targetSlotIdx+1})`):null;
  const rect=slotEl&&slotEl.getBoundingClientRect?slotEl.getBoundingClientRect():null;
  await new Promise(resolve=>{
    const img=document.createElement('img');
    img.className='map-board-change-vfx';
    img.alt='';
    // 対象マスの中心へ重ねる。
    if(rect&&rect.width&&rect.height){
      const size=Math.max(rect.width,rect.height)*2.6;
      img.style.left=`${rect.left+rect.width/2}px`;
      img.style.top=`${rect.top+rect.height*0.5}px`;
      img.style.width=`${size}px`;
      img.style.maxWidth='none';
      img.style.height='auto';
      img.style.transform='translate(-50%,-50%)';
    }
    img.src=webpUrl+(webpUrl.includes('?')?'&':'?')+'_r='+Math.random();
    document.body.appendChild(img);
    let done=false;
    const finish=()=>{ if(done) return; done=true; img.remove(); resolve(); };
    if(typeof onMidpoint==='function') setTimeout(()=>{ try{ onMidpoint(); }catch(_e){} },500);
    // webpアニメーションは再生完了イベントを持たないため、固定尺で終える。
    setTimeout(finish,1200);
  });
}
async function _playMapForgeSlotRoll(candidates,target,power){
  G._mapForgeAnimating=true;
  // 候補マスの一斉発光も、対象マスの白い枠発光も廃止。対象位置はVFX（webp）だけで示す。
  G._mapForgeCandidateSlots=null;
  G._mapForgeHighlightSlot=null;
  document.body?.classList.remove('map-forge-roll-hide-cards');
  // 先にカードへ .map-forge-roll-card-fade を付けた状態で描画しておく。
  if(typeof renderHandEditor==='function') renderHandEditor();
  await _mapDelay(60);
  // ここではrenderHandEditor()を呼ばない。DOMを作り直すと新要素が最初からopacity:0で
  // 生成されCSS transitionが走らず「急に消える」ため、クラス追加だけでフェードさせる。
  document.body?.classList.add('map-forge-roll-hide-cards');
  await _mapDelay(500);
  await _playMapBoardChangeVfx(power&&power.id==='summon',target,()=>{
    // VFX開始0.5秒後にマス画像を変化後のものへ差し替える。
    G.mapPanelPowers=G.mapPanelPowers||{};
    G.mapPanelPowers[target]=power.id;
    if(typeof renderHandEditor==='function') renderHandEditor();
  });
  await _mapDelay(220);
}
async function applyPendingMapForgePower(powerOrSlotIdx){
  if(G._mapForgeAnimating) return false;
  const power=powerOrSlotIdx&&typeof powerOrSlotIdx==='object'?powerOrSlotIdx:G._pendingMapForgePower;
  if(!power) return false;
  if((G.gold||0)<power.price) return false;
  const candidates=_mapForgeCandidateSlots(power);
  if(!candidates.length) return false;
  const target=randFrom(candidates);
  G.gold-=power.price;
  G._pendingMapForgePower=power;
  G._mapForgeAnimating=true;
  // 候補マスの一斉発光は廃止（_playMapForgeSlotRoll側で対象1マスのみ光らせる）。
  G._mapForgeCandidateSlots=null;
  G._mapForgeHighlightSlot=null;
  if(typeof refreshRewardGoldUi==='function') refreshRewardGoldUi();
  renderMapForgeOffers();
  await _playMapForgeSlotRoll(candidates,target,power);
  G.mapPanelPowers=G.mapPanelPowers||{};
  G.mapPanelPowers[target]=power.id;
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
  G._mapForgeAnimating=false;
  G._mapForgeCandidateSlots=null;
  G._mapForgeHighlightSlot=null;
  document.body?.classList.remove('map-forge-roll-hide-cards');
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
  G._isItemShop=false;
  G._isTavern=true;
  G._isForge=false;
  G._isVillageMenu=false;
  G._isTreasureMapReward=false;
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  goToReward();
  _rewCards=[];
  _rewFreePickDone=true;
  // ボスはマップ上に配置されず、ターン制限到達時にのみ現在地へ現れるため、
  // 方角ではなく残りターン数を伝える。
  const m=G.worldMap;
  const left=Math.max(0,Number(m&&m.turnLimit||WORLD_MAP_BASE_TURN_LIMIT)-Number(m&&m.turn||0));
  const section=document.getElementById('battle-order-section');
  const row=document.getElementById('battle-order-row');
  if(section&&row){
    section.style.display='';
    row.innerHTML=`<div class="map-tavern-card"><strong>酒場の噂</strong><span>ボスが現れるまで、あと${left}ターンだという。</span></div>`;
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
  G._isItemShop=false;
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
  node.type='empty';
  node._clearedEvent=true;
  delete node._terrainType;
  const r=Math.floor(Math.random()*3);
  if(r===0){
    const c=drawPanel(1,Math.min(5,G.rewardGrade||1))[0];
    const idx=(G.mainBoard||[]).findIndex(x=>!x);
    if(c&&idx>=0) G.mainBoard[idx]=c;
  } else if(r===1){
    if(typeof onGoldGained==='function') onGoldGained(100);
    else G.gold=(G.gold||0)+100;
  } else {
    G.worldMap.turnLimit=(G.worldMap.turnLimit||WORLD_MAP_BASE_TURN_LIMIT)+3;
  }
  renderWorldMap();
  updateHUD();
}
