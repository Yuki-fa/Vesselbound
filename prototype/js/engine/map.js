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
function generateWorldMap(index){
  const target=WORLD_MAP_TOTAL_TILES;
  const startId=_pickWorldMapStartId();
  const picked=new Set([startId]);
  const edges=[];
  const pointCache=new Map();
  const pointFor=id=>{
    if(!pointCache.has(id)) pointCache.set(id,_mapVisualPointFor(id));
    return pointCache.get(id);
  };
  while(picked.size<target){
    const frontier=[];
    const frontierLoose=[];
    picked.forEach(id=>_mapNeighborsWide(id).forEach(nb=>{
      if(picked.has(nb)||_mapEdgesWouldCrossDiagonal(id,nb,edges)||_mapEdgeCrossesAny(id,nb,edges,pointFor)||!_mapEdgeAngleOk(id,nb,edges,pointFor,30)) return;
      frontierLoose.push({from:id,to:nb});
      // 無関係な道・アイコンへの接近を避けられる候補を優先する。全滅した場合のみ
      // （マス全体を埋め切る都合上どうしても余白が取れない場合）frontierLooseで妥協する。
      if(_mapEdgeStaysClearOfOtherNodes(id,nb,picked,pointFor)) frontier.push({from:id,to:nb});
    }));
    const pool=frontier.length?frontier:frontierLoose;
    if(!pool.length) break;
    const next=randFrom(pool);
    picked.add(next.to);
    edges.push([next.from,next.to]);
  }
  // 全49マス（7x7グリッド全体）を使い切れなかった場合は作り直す（角度・交差制約で稀に埋まりきらないため）。
  if(picked.size<target&&(generateWorldMap._retry||0)<80){
    generateWorldMap._retry=(generateWorldMap._retry||0)+1;
    return generateWorldMap(index);
  }
  generateWorldMap._retry=0;
  const nodes=[...picked].map(id=>_newMapNode(id,pointFor(id)));
  _computeMapDistances(nodes,startId,edges);
  nodes.forEach(n=>{
    if(n.id===startId){ n.type='start'; n.visited=true; n.cleared=true; return; }
    n.type='battle';
  });
  // 比率通りに村・宝箱・エリート・イベントを配置（残りは通常戦闘のまま）。ボスはマップ上に配置しない。
  _assignInitialMapNodeTypes(nodes,edges,startId);
  const revealed={[startId]:true};
  nodes.forEach(n=>{
    if(n.type==='elite'){
      // エリートは初期配置時点で位置を開示する。
      n.visible=true;
      n._eliteMoveClock=0;
      n._elitePowerMult=1;
      n._eliteFromId=null;
      revealed[n.id]=true;
    }
  });
  const m={
    index:index||1,
    turn:0,
    turnLimit:WORLD_MAP_BASE_TURN_LIMIT,
    current:startId,
    startId,
    nodes,
    revealed,
    revealedEdges:{},
    forcedBoss:false,
    eliteBossBonusMult:1,
    // 移動履歴（敗北時に2歩後退させるために使う。ワープ系は別途リセットする）。
    moveHistory:[startId],
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
    .filter(n=>n&&(n.visible||_mapNodeForceIconVisible(n))&&n.id!==current&&_mapPathBetween(current,n.id).length>1)
    .map(n=>n.id));
  G.worldMap.nodes.forEach(n=>{
    const forceIcon=_mapNodeForceIconVisible(n);
    if(!n.visible&&!forceIcon) return;
    const btn=document.createElement('button');
    const type=n.id===current?'player':(n.cleared&&n.type!=='village'&&n.type!=='boss'?(n._clearedEvent?'empty2':'empty'):n.type);
    btn.className=`map-node type-${n.type}`;
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
  if(type==='empty2') return Assets.map.empty2||Assets.map.empty;
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
    const encounter=_moveMapElites();
    _revealAroundCurrentMapNode();
    renderWorldMap();
    updateHUD();
    await _mapDelay(180);
    if(encounter){
      startMapBattle('elite',encounter.id,false);
      return true;
    }
    return false;
  }finally{
    G._mapAutoMoving=false;
  }
}
async function _moveToAdjacentMapNode(id,options){
  const m=G.worldMap;
  if(!m||!_mapNodeById(id)) return false;
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
  const path=_mapPathBetween(m.current,id);
  if(path.length<2) return;
  const eliteAhead=path.slice(1).some(pid=>{ const pn=_mapNodeById(pid); return pn&&pn.type==='elite'; });
  if(eliteAhead){
    _openMapConfirmDialog('ここに移動すると戦闘になります',()=>_executeMoveToMapNode(id));
    return;
  }
  _executeMoveToMapNode(id);
}
async function _executeMoveToMapNode(id){
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
    const encounter=_moveMapElites();
    _revealAroundCurrentMapNode();
    if(encounter){
      startMapBattle('elite',encounter.id,false);
    }else{
      if(_worldMapLimitReached()) _startForcedWorldMapBossBattle();
      else renderWorldMap();
    }
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
  const alive=(G.enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject).length;
  if(G.worldMap){
    for(let i=0;i<alive;i++){
      if(_worldMapNextTurnWouldForceBoss()) return !!_startForcedWorldMapBossBattle();
      G.worldMap.turn=(G.worldMap.turn||0)+1;
      _applyWorldMapTurnEvents();
      const encounter=_moveMapElites();
      if(encounter){
        startMapBattle('elite',encounter.id,false);
        return true;
      }
    }
  }
  G._mapBattle=null;
  G._mapEliteBattle=false;
  G._forceBossMult=null;
  if(G.worldMap) _retreatWorldMapAfterDefeat();
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
    return [0,1,2,3,4].filter(i=>i<size&&_mapPanelPowerIdAtSafe(i)!=='summon');
  }
  return Array.from({length:size},(_,i)=>i).filter(i=>_mapPanelPowerIdAtSafe(i)==='summon');
}
async function _playMapForgeSlotRoll(candidates,target){
  const ordered=[...candidates].sort((a,b)=>a-b);
  G._mapForgeAnimating=true;
  G._mapForgeCandidateSlots=ordered;
  G._mapForgeHighlightSlot=null;
  document.body?.classList.remove('map-forge-roll-hide-cards');
  if(typeof renderHandEditor==='function') renderHandEditor();
  await _mapDelay(120);
  document.body?.classList.add('map-forge-roll-hide-cards');
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(ordered.length<=1){
    G._mapForgeHighlightSlot=target;
    if(typeof renderHandEditor==='function') renderHandEditor();
    await _mapDelay(260);
    return;
  }
  await _mapDelay(260);
  const targetPos=Math.max(0,ordered.indexOf(target));
  const loops=4;
  const steps=ordered.length*loops+targetPos+1;
  for(let s=0;s<steps;s++){
    const t=steps<=1?1:s/(steps-1);
    const delay=32+Math.pow(t,2.2)*150;
    G._mapForgeHighlightSlot=ordered[s%ordered.length];
    if(typeof renderHandEditor==='function') renderHandEditor();
    await _mapDelay(delay);
  }
  G._mapForgeHighlightSlot=target;
  if(typeof renderHandEditor==='function') renderHandEditor();
  await _mapDelay(420);
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
  G._mapForgeCandidateSlots=[...candidates].sort((a,b)=>a-b);
  G._mapForgeHighlightSlot=null;
  if(typeof refreshRewardGoldUi==='function') refreshRewardGoldUi();
  renderMapForgeOffers();
  await _playMapForgeSlotRoll(candidates,target);
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
    G.gold=(G.gold||0)+100;
  } else {
    G.worldMap.turnLimit=(G.worldMap.turnLimit||WORLD_MAP_BASE_TURN_LIMIT)+3;
  }
  renderWorldMap();
  updateHUD();
}
