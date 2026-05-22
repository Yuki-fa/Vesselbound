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
    // 強欲秘術：報酬フェイズで残ったソウルを最大3まで持ち越す
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
  const isRing=card.kind==='summon'||card.kind==='passive'||card.type==='ring'||!card.type;
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined) nc.usesLeft=nc.baseUses||randUses();
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  if(isRing){
    delete nc._buyPrice;
    const owner=typeof getSelectedAlly==='function'?getSelectedAlly():null;
    if(typeof isHumanEquipmentMode==='function'&&isHumanEquipmentMode(owner)){
      const eqIdx=typeof equipRingToSelectedHuman==='function'?equipRingToSelectedHuman(nc):-1;
      if(eqIdx>=0){
        if(nc.unique==='great_mother'){
          G.allies.forEach(a=>{ if(a&&a.effect==='dragonet_end') a._dragonetBonus=(a._dragonetBonus||0)+1; });
        }
      }
      return;
    }
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
// ワールドマップ進行（4マップ制）
// ═══════════════════════════════════════

const WORLD_MAP_ENABLED=true;
const WORLD_MAP_W=14;
const WORLD_MAP_H=5;
const WORLD_MAP_NODE_COUNT=55;
const WORLD_MAP_TURN_LIMIT=30;
const WORLD_MAP_TYPES=['treasure','altar','event','shop','boss','elite','mob','empty'];
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
  G._mapForceElite=false;
  G._mapForceBoss=false;
  G._fromWorldMapShop=false;
  G._mapChoiceOpen=null;
  G._worldMapFreeRecruit=false;
  G._mapBattleCount=0;
  G._extraBattleMult=1.0;
  G._battleAutoMode=false;
  G._openingIntervention=false;
  if(!Array.isArray(G._shopGradeWeights)) G._shopGradeWeights=[90,7,2.5,0.5];
  G.worldMap=_generateWorldMap();
  G.mapPosition=G.worldMap.startId;
  G.phase='map';
  _revealWorldMapAround(G.mapPosition);
  if(typeof clearLog==='function') clearLog();
  showScreen('battle');
  showWorldMap();
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
  // 旧1階固定構成は「ゲーム最初の1戦目」だけに限定する。
  // 以後の1マップ目通常戦は同じG1帯の通常敵生成を使う。
  if((G.mapIndex||1)===1&&lo===1) return randi(2,hi);
  return randi(lo,hi);
}

function _nodeId(x,y){ return `${x},${y}`; }
function _nodeDist(a,b){
  const [ax,ay]=a.split(',').map(Number);
  const [bx,by]=b.split(',').map(Number);
  return Math.abs(ax-bx)+Math.abs(ay-by);
}
function _nodeGridDist(a,b){
  const [ax,ay]=a.split(',').map(Number);
  const [bx,by]=b.split(',').map(Number);
  return Math.max(Math.abs(ax-bx),Math.abs(ay-by));
}
function _nodePos(id){
  const [x,y]=id.split(',').map(Number);
  return {x,y};
}
function _worldMapAxisPct(v,max){
  if(max<=0) return 50;
  return 5+(v/max)*90;
}
function _worldMapNodeLeft(x){ return _worldMapAxisPct(x,WORLD_MAP_W-1); }
function _worldMapNodeTop(y){ return _worldMapAxisPct(y,WORLD_MAP_H-1); }
function _worldMapEdgeKey(a,b){
  return [a,b].sort().join('|');
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
  const neighbors=(id)=>{
    const {x,y}=_nodePos(id);
    return WORLD_MAP_DIRS.map(([dx,dy])=>[x+dx,y+dy])
      .filter(([nx,ny])=>nx>=0&&nx<WORLD_MAP_W&&ny>=0&&ny<WORLD_MAP_H)
      .map(([nx,ny])=>_nodeId(nx,ny));
  };
  const selected=new Set([startId]);
  neighbors(startId).forEach(id=>selected.add(id));
  while(selected.size<Math.min(WORLD_MAP_NODE_COUNT,WORLD_MAP_W*WORLD_MAP_H)){
    const frontier=[];
    selected.forEach(id=>{
      neighbors(id).forEach(n=>{ if(!selected.has(n)) frontier.push(n); });
    });
    const uniq=[...new Set(frontier)];
    if(!uniq.length) break;
    selected.add(randFrom(uniq));
  }

  const nodes={};
  for(let y=0;y<WORLD_MAP_H;y++){
    for(let x=0;x<WORLD_MAP_W;x++){
      const id=_nodeId(x,y);
      if(!selected.has(id)) continue;
      nodes[id]={id,x,y,type:'mob',links:[],cleared:false,seen:false};
    }
  }
  const addLink=(a,b)=>{
    if(!nodes[a]||!nodes[b]||a===b) return;
    if(!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if(!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };

  // 選ばれた55マスだけを全到達可能なランダム木にする。
  const visited=new Set([startId]);
  const frontier=neighbors(startId).filter(id=>nodes[id]).map(id=>({from:startId,to:id}));
  while(visited.size<Object.keys(nodes).length&&frontier.length){
    const idx=Math.floor(Math.random()*frontier.length);
    const edge=frontier.splice(idx,1)[0];
    if(visited.has(edge.to)) continue;
    addLink(edge.from,edge.to);
    visited.add(edge.to);
    neighbors(edge.to).forEach(n=>{ if(nodes[n]&&!visited.has(n)) frontier.push({from:edge.to,to:n}); });
  }
  Object.keys(nodes).forEach(id=>{
    neighbors(id).forEach(n=>{
      if(nodes[n]&&id<n&&Math.random()<0.10) addLink(id,n);
    });
  });
  // 初期位置から最低2方向。接続先は必ず雑魚戦にする。
  neighbors(startId).filter(id=>nodes[id]).forEach(id=>addLink(startId,id));

  const reserved=new Set([startId,...nodes[startId].links]);
  nodes[startId].type='empty';
  nodes[startId].cleared=true;
  nodes[startId].links.forEach(id=>{ nodes[id].type='mob'; reserved.add(id); });

  const allIds=Object.keys(nodes);
  const openIds=()=>allIds.filter(id=>!reserved.has(id));
  const pickMany=(count, scorer)=>{
    const picked=[];
    for(let i=0;i<count;i++){
      const cands=openIds();
      if(!cands.length) break;
      cands.sort((a,b)=>(scorer?scorer(b,picked):Math.random())-(scorer?scorer(a,picked):Math.random()));
      const id=cands[0];
      reserved.add(id);
      picked.push(id);
    }
    return picked;
  };

  const pathDist=_nodePathDistances(nodes,startId);
  const bossCands=openIds().filter(id=>(pathDist[id]??0)>=6);
  const bossId=(bossCands.length?randFrom(bossCands):randFrom(openIds()));
  if(bossId){ reserved.add(bossId); nodes[bossId].type='boss'; }

  const minShopDist=2;
  const shopCount=randi(4,5);
  const shopIds=[];
  const shopBands=[[0,3],[4,7],[8,11],[10,13]];
  shopBands.forEach(([minX,maxX])=>{
    if(shopIds.length>=shopCount) return;
    let cands=openIds().filter(id=>{
      const p=_nodePos(id);
      return p.x>=minX&&p.x<=maxX&&shopIds.every(s=>_nodeGridDist(id,s)>=minShopDist);
    });
    if(!cands.length){
      cands=openIds().filter(id=>{
        const p=_nodePos(id);
        return p.x>=minX&&p.x<=maxX;
      });
    }
    if(!cands.length) return;
    cands.sort((a,b)=>_nodeDist(b,startId)-_nodeDist(a,startId)+Math.random()*0.5);
    const id=cands[0];
    reserved.add(id);
    shopIds.push(id);
  });
  shopBands.forEach(([minX,maxX])=>{
    if(shopIds.some(id=>{
      const p=_nodePos(id);
      return p.x>=minX&&p.x<=maxX;
    })) return;
    let cands=openIds().filter(id=>{
      const p=_nodePos(id);
      return p.x>=minX&&p.x<=maxX;
    });
    if(!cands.length){
      cands=allIds.filter(id=>{
        const p=_nodePos(id);
        return p.x>=minX&&p.x<=maxX&&id!==startId&&id!==bossId&&!nodes[startId].links.includes(id)&&!shopIds.includes(id);
      });
    }
    if(!cands.length) return;
    const id=randFrom(cands);
    reserved.add(id);
    shopIds.push(id);
  });
  while(shopIds.length<shopCount){
    const cands=openIds().filter(id=>shopIds.every(s=>_nodeGridDist(id,s)>=minShopDist));
    if(!cands.length) break;
    cands.sort((a,b)=>{
      const score=(id)=>{
        const nearest=shopIds.length?Math.min(...shopIds.map(s=>_nodeGridDist(id,s))):minShopDist;
        return _nodeDist(id,startId)*0.35+nearest*0.55+Math.random();
      };
      return score(b)-score(a);
    });
    const id=cands[0];
    reserved.add(id);
    shopIds.push(id);
  }
  while(shopIds.length<shopCount){
    let cands=openIds().filter(id=>shopIds.every(s=>_nodeGridDist(id,s)>=minShopDist));
    if(!cands.length) cands=openIds();
    if(!cands.length) break;
    const id=randFrom(cands);
    reserved.add(id);
    shopIds.push(id);
  }
  shopIds.forEach(id=>nodes[id].type='shop');

  pickMany(_worldMapAltarCount()).forEach(id=>nodes[id].type='altar');
  pickMany(randi(3,5)).forEach(id=>nodes[id].type='treasure');
  pickMany(randi(8,10)).forEach(id=>nodes[id].type='event');
  pickMany(randi(2,3)).forEach(id=>nodes[id].type='elite');

  return {w:WORLD_MAP_W,h:WORLD_MAP_H,startId,nodes,nodeCount:Object.keys(nodes).length};
}

function _revealWorldMapAround(id){
  if(!G.worldMap||!id) return;
  const q=[{id,d:0}];
  const seen=new Set([id]);
  const dist={[id]:0};
  while(q.length){
    const cur=q.shift();
    const node=G.worldMap.nodes[cur.id];
    if(node) node.seen=true;
    if(cur.d>=2) continue;
    (node?.links||[]).forEach(n=>{
      if(seen.has(n)) return;
      seen.add(n);
      dist[n]=cur.d+1;
      q.push({id:n,d:cur.d+1});
    });
  }
  const previewEdges=new Set();
  Object.keys(dist).forEach(nodeId=>{
    if(dist[nodeId]!==2) return;
    const node=G.worldMap.nodes[nodeId];
    (node?.links||[]).forEach(to=>{
      const target=G.worldMap.nodes[to];
      if(!target||target.seen) return;
      previewEdges.add(_worldMapEdgeKey(nodeId,to));
    });
  });
  G.worldMap.previewEdges=[...previewEdges];
}

function _worldMapNodeImage(type){
  const m=Assets&&Assets.map?Assets.map:{};
  return m[type]||m.empty||'';
}

function showWorldMap(){
  G._fromWorldMapShop=false;
  G._worldMapFreeRecruit=false;
  G.phase='map';
  G.floor=_worldMapBaseFloor(G.mapIndex||1);
  if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('battle');
  if(typeof renderAll==='function') renderAll();
  _setWorldMapNonCombatUI(true);
  updateHUD();
  const panel=document.getElementById('world-map-panel');
  const grid=document.getElementById('world-map-grid');
  const turnEl=document.getElementById('map-turn-limit');
  if(!panel||!grid||!G.worldMap) return;
  panel.hidden=false;
  panel.classList.remove('map-exit');
  if(Assets&&Assets.map&&Assets.map.panel) panel.style.backgroundImage=`url("${Assets.map.panel}")`;
  if(turnEl){
    turnEl.textContent=`${G.mapTurn||1}/${G.mapTurnLimit||WORLD_MAP_TURN_LIMIT}`;
    turnEl.classList.toggle('danger',(G.mapTurn||1)>10);
  }
  grid.innerHTML='';
  const edge=document.createElement('div');
  edge.className='map-edge-layer';
  grid.appendChild(edge);
  const drawn=new Set();
  Object.values(G.worldMap.nodes).forEach(n=>{
    n.links.forEach(to=>{
      const target=G.worldMap.nodes[to];
      if(!target) return;
      const key=_worldMapEdgeKey(n.id,to);
      if(drawn.has(key)) return;
      const preview=Array.isArray(G.worldMap.previewEdges)&&G.worldMap.previewEdges.includes(key);
      const visible=n.seen&&target.seen;
      if(!visible&&!preview) return;
      drawn.add(key);
      edge.appendChild(_makeWorldMapEdge(n,target,{preview}));
    });
  });
  Object.values(G.worldMap.nodes).forEach(n=>{
    if(!n.seen) return;
    const btn=document.createElement('button');
    const moveable=_isWorldMapAdjacentMove(n.id);
    btn.className='map-node';
    btn.classList.add(`type-${n.type||'empty'}`);
    if(moveable) btn.classList.add('is-moveable');
    if(n.id===G.mapPosition) btn.classList.add('is-current');
    if(n.cleared) btn.classList.add('is-cleared');
    btn.style.left=`${_worldMapNodeLeft(n.x)}%`;
    btn.style.top=`${_worldMapNodeTop(n.y)}%`;
    btn.style.backgroundImage=`url("${n.id===G.mapPosition?_worldMapNodeImage('empty'):_worldMapNodeImage(n.type)}")`;
    btn.title=n.id===G.mapPosition?'現在地':_worldMapLabel(n.type);
    btn.onclick=()=>{ if(moveable) chooseWorldMapNode(n.id); };
    grid.appendChild(btn);
  });
  const cur=G.worldMap.nodes[G.mapPosition];
  const token=document.createElement('div');
  token.className='map-token';
  token.style.left=`${_worldMapNodeLeft(cur.x)}%`;
  token.style.top=`${_worldMapNodeTop(cur.y)}%`;
  token.style.backgroundImage=`url("${_worldMapNodeImage('player')}")`;
  grid.appendChild(token);
}

function _makeWorldMapEdge(a,b,opts){
  const grid=document.getElementById('world-map-grid');
  const gridW=Math.max(1,grid?(grid.clientWidth||grid.offsetWidth):2800);
  const gridH=Math.max(1,grid?(grid.clientHeight||grid.offsetHeight):862);
  const ax=(_worldMapNodeLeft(a.x)/100)*gridW;
  const ay=(_worldMapNodeTop(a.y)/100)*gridH;
  const bx=(_worldMapNodeLeft(b.x)/100)*gridW;
  const by=(_worldMapNodeTop(b.y)/100)*gridH;
  const dx=bx-ax, dy=by-ay;
  const len=Math.sqrt(dx*dx+dy*dy);
  const safeLen=Math.max(len,0.0001);
  const ux=dx/safeLen, uy=dy/safeLen;
  const nodeRadius=(n)=>{
    if(n.id===G.mapPosition) return 38;
    if((n.type||'empty')==='empty') return n.id===G.mapPosition?38:13;
    return 30;
  };
  const startPad=nodeRadius(a)+5;
  const endPad=nodeRadius(b)+5;
  const sx=ax+ux*startPad, sy=ay+uy*startPad;
  const ex=bx-ux*endPad, ey=by-uy*endPad;
  const lx=ex-sx, ly=ey-sy;
  const lineLen=Math.max(0,Math.sqrt(lx*lx+ly*ly));
  let angle=Math.atan2(ly,lx);
  const gx=Math.sign(b.x-a.x);
  const gy=Math.sign(b.y-a.y);
  if(gx&&gy) angle=(gy>0?(gx>0?45:135):(gx>0?-45:-135))*Math.PI/180;
  else if(gx) angle=gx>0?0:Math.PI;
  else if(gy) angle=gy>0?Math.PI/2:-Math.PI/2;
  const line=document.createElement('div');
  line.style.position='absolute';
  line.style.left=`${sx}px`;
  line.style.top=`${sy}px`;
  line.style.width=`${lineLen}px`;
  line.style.height='8px';
  line.style.transformOrigin='0 50%';
  line.style.transform=`translateY(-50%) rotate(${angle}rad)`;
  line.style.backgroundImage=`url("${Assets.map.dashedLine}")`;
  line.style.backgroundRepeat='repeat-x';
  line.style.backgroundSize='64px 8px';
  line.style.opacity=opts&&opts.preview?'.34':'.62';
  return line;
}

function _isWorldMapAdjacentMove(id){
  if(!G.worldMap||!G.worldMap.nodes[id]||id===G.mapPosition) return false;
  const cur=G.worldMap.nodes[G.mapPosition];
  if(!cur||!cur.links||!cur.links.includes(id)) return false;
  return _nodeGridDist(G.mapPosition,id)===1;
}

function _worldMapLabel(type){
  return {
    treasure:'宝', altar:'祭壇', event:'イベント', shop:'ショップ',
    boss:'ボス戦', elite:'エリート戦', mob:'雑魚戦', empty:'空きマス'
  }[type]||type;
}

async function chooseWorldMapNode(id){
  if(!G.worldMap||!G.worldMap.nodes[id]) return;
  if(!_isWorldMapAdjacentMove(id)) return;
  G.mapPosition=id;
  _revealWorldMapAround(id);
  showWorldMap();
  await sleep(340);
  if(!_consumeWorldMapTurn()){
    return;
  }
  const node=G.worldMap.nodes[id];
  resolveWorldMapNode(node);
}

function _consumeWorldMapTurn(opts){
  G.mapTurn=(G.mapTurn||1)+1;
  updateHUD();
  if(G.mapTurn>G.mapTurnLimit){
    if(opts&&opts.deferGameOver) return false;
    gameOver();
    return false;
  }
  return true;
}

function resolveWorldMapNode(node){
  if(!node||G.phase==='gameover') return;
  const type=node.type||'empty';
  G._mapNodeType=type;
  if(['mob','elite','treasure','altar','event'].includes(type)){
    node.type='empty';
    node.cleared=true;
  }
  if(type==='empty'){
    G._mapNodeType=null;
    showWorldMap();
  } else if(type==='treasure'){
    _resolveWorldMapTreasure();
    G._mapNodeType=null;
  } else if(type==='altar'){
    _resolveWorldMapAltar();
    G._mapNodeType=null;
    showWorldMap();
  } else if(type==='event'){
    G._mapNodeType=null;
    _resolveWorldMapEvent();
  } else if(type==='shop'){
    G._mapNodeType=null;
    G._fromWorldMapShop=true;
    _setWorldMapNonCombatUI(false);
    const panel=document.getElementById('world-map-panel');
    if(panel) panel.hidden=true;
    doShop();
  } else if(type==='mob'||type==='elite'||type==='boss'){
    _startWorldMapBattle(type);
  }
}

function _resolveWorldMapTreasure(){
  const pool=[
    ...SPELL_POOL.filter(c=>c&&c.id&&!c.starterOnly&&c.rarity>=2),
    ...RING_POOL.filter(c=>c&&c.id&&!c.legend&&c.rarity>=2),
  ];
  const panel=document.getElementById('world-map-panel');
  if(!pool.length||!panel){
    log('宝：獲得できるカードがありません','sys');
    showWorldMap();
    return;
  }
  showWorldMap();
  G._mapChoiceOpen='treasure';
  if(typeof renderHandSlots==='function') renderHandSlots();
  const old=panel.querySelector('.map-event-choice');
  if(old) old.remove();
  const used=new Set();
  const choices=[];
  let guard=0;
  while(choices.length<3&&guard++<80){
    const base=randFrom(pool);
    if(!base||used.has(base.id)) continue;
    used.add(base.id);
    const card=clone(base);
    if(card.type==='wand'){
      const uses=card.baseUses||(card.baseUsesRange?randi(card.baseUsesRange[0],card.baseUsesRange[1]):randUses());
      card.usesLeft=uses; card._maxUses=uses;
    }
    card._buyPrice=0;
    choices.push(card);
  }
  const box=document.createElement('div');
  box.className='map-event-choice map-treasure-choice';
  const title=document.createElement('div');
  title.className='map-choice-title';
  title.textContent='宝：1つ選んで獲得';
  box.appendChild(title);
  const cards=document.createElement('div');
  cards.className='map-choice-cards';
  choices.forEach(card=>{
    const div=typeof _mkRewDiv==='function'?_mkRewDiv(card,()=>{},null):document.createElement('button');
    div.classList.add('map-choice-reward-card');
    if(!div.innerHTML) div.textContent=card.name;
    div.onclick=()=>{
      G._mapChoiceOpen=null;
      takeCardToHand(card);
      log(`宝：${card.name}を獲得`,'gold');
      box.remove();
      if(typeof renderHandSlots==='function') renderHandSlots();
      showWorldMap();
    };
    cards.appendChild(div);
  });
  box.appendChild(cards);
  panel.appendChild(box);
}

function _resolveWorldMapAltar(){
  const healUnit=(u)=>{
    if(!u||u.hp<=0) return 0;
    const max=Math.max(1,u.maxHp||u.hp||1);
    const before=u.hp;
    u.hp=Math.min(max,u.hp+Math.ceil(max*0.5));
    return u.hp-before;
  };
  let healed=0;
  (G.allies||[]).forEach(u=>{ healed+=healUnit(u); });
  (G.enemies||[]).forEach(u=>{ healed+=healUnit(u); });
  G._altarUsedCount=(G._altarUsedCount||0)+1;
  log(`祭壇：全キャラのライフを最大値の50%回復${healed?`（合計+${healed}）`:''}`,'good');
  if(typeof renderAll==='function') renderAll();
  updateHUD();
}

function _resolveWorldMapEvent(){
  _applyWorldMapEventReward('イベント');
  showWorldMap();
}

function _applyWorldMapEventReward(label){
  const k=randi(0,2);
  if(k===0){
    G.actionsPerTurn=(G.actionsPerTurn||1)+1;
    log(`${label}：行動力+1`,'good');
  } else if(k===1){
    if(typeof onMagicLevelUp==='function') onMagicLevelUp(1);
    else G.magicLevel=(G.magicLevel||1)+1;
    log(`${label}：魔術レベル+1`,'good');
  } else {
    if(typeof onGoldGained==='function') onGoldGained(5);
    else G.gold=(G.gold||0)+5;
    log(`${label}：ソウル+5`,'good');
  }
  updateHUD();
}

function _startWorldMapBattle(type){
  const panel=document.getElementById('world-map-panel');
  if(panel){
    panel.classList.add('map-exit');
    setTimeout(()=>{ panel.hidden=true; panel.classList.remove('map-exit'); },480);
  }
  _setWorldMapNonCombatUI(false);
  G._mapNodeType=type;
  G._mapForceElite=type==='elite';
  G._mapForceBoss=type==='boss';
  G._mapBattleCount=(G._mapBattleCount||0)+1;
  const isFirstRunBattle=(G.mapIndex||1)===1&&G._mapBattleCount===1;
  const countedBattles=Math.max(0,(G._mapBattleCount||0)-2);
  G._extraBattleMult=type==='mob'?1+(0.2*countedBattles):1.0;
  G.floor=isFirstRunBattle?1:_worldMapBattleFloor(type);
  showScreen('battle');
  startBattle();
}

function completeWorldMapBattle(){
  const type=G._mapNodeType;
  G._mapNodeType=null;
  G._mapForceElite=false;
  G._mapForceBoss=false;
  G._bossJustDefeated=false;
  if(type==='boss'){
    if((G.mapIndex||1)>=4){
      showScreen('clear');
      return;
    }
    initWorldMap((G.mapIndex||1)+1);
    return;
  }
  showWorldMap();
}

function _worldMapShopWeights(){
  const w=Array.isArray(G._shopGradeWeights)?G._shopGradeWeights:[90,7,2.5,0.5];
  return [w[0]??90,w[1]??7,w[2]??2.5,w[3]??0.5];
}

function _worldMapAltarCount(){
  const idx=G.mapIndex||1;
  if(idx<=2) return 4;
  if(idx===3) return Math.min(4,Math.max(0,10-(G._altarUsedCount||0)));
  return 0;
}

function showWorldMapPostBattleRecruit(){
  G._worldMapFreeRecruit=true;
  G._fromWorldMapShop=false;
  G.phase='reward';
  G._isRewardTown=false;
  _rewFreePickDone=false;
  if(typeof showScreen==='function') showScreen('battle');
  if(typeof renderAll==='function') renderAll();
  _setWorldMapRewardPickUI();
  const picks=[];
  const used=new Set();
  const targetGrade=G.rewardGrade||1;
  let guard=0;
  while(picks.length<3&&guard++<60){
    const card=typeof drawCharacterOfGrade==='function'?drawCharacterOfGrade(targetGrade):null;
    if(!card) break;
    if(used.has(card.id)) continue;
    used.add(card.id);
    card._buyPrice=0;
    picks.push(card);
  }
  if(picks.length<3&&typeof drawCharacters==='function'){
    drawCharacters(3-picks.length).forEach(card=>{
      if(card&&card._isChar&&!used.has(card.id)){
        used.add(card.id);
        card._buyPrice=0;
        picks.push(card);
      }
    });
  }
  _rewCards=[null,null,null,null,null,null];
  picks.forEach((card,i)=>{ _rewCards[i]=card; });
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  if(typeof renderGradeUpBtn==='function') renderGradeUpBtn();
  if(typeof updateHUD==='function') updateHUD();
}

function _setWorldMapNonCombatUI(isMap){
  document.body.classList.toggle('world-map-active',!!isMap);
  if(isMap) document.body.classList.remove('world-map-shop');
  const mapPanel=document.getElementById('world-map-panel');
  if(mapPanel) mapPanel.hidden=!isMap;
  const enemyArea=document.getElementById('enemy-area');
  if(enemyArea) enemyArea.style.display=isMap?'none':'';
  const enemyHand=document.getElementById('enemy-hand-area');
  if(enemyHand) enemyHand.style.display=isMap?'none':'';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display=isMap?'none':'';
  const rewardCards=document.getElementById('reward-cards-section');
  if(rewardCards) rewardCards.style.display=isMap?'none':'';
  const rewardInfo=document.getElementById('reward-info-bar');
  if(rewardInfo) rewardInfo.style.display=isMap?'none':'';
  const rewardMove=document.getElementById('reward-move-btns');
  if(rewardMove) rewardMove.style.display=isMap?'none':'';
  const pass=document.getElementById('btn-pass');
  if(pass) pass.style.display=isMap?'none':'';
  const ally=document.getElementById('ally-section');
  if(ally) ally.style.display='';
}

function _setWorldMapRewardPickUI(){
  document.body.classList.remove('world-map-active');
  const mapPanel=document.getElementById('world-map-panel');
  if(mapPanel) mapPanel.hidden=true;
  const enemyArea=document.getElementById('enemy-area');
  if(enemyArea) enemyArea.style.display='none';
  const enemyHand=document.getElementById('enemy-hand-area');
  if(enemyHand) enemyHand.style.display='none';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display='none';
  const rewardCards=document.getElementById('reward-cards-section');
  if(rewardCards) rewardCards.style.display='';
  const rewardInfo=document.getElementById('reward-info-bar');
  if(rewardInfo) rewardInfo.style.display='';
  const rewardMove=document.getElementById('reward-move-btns');
  if(rewardMove) rewardMove.style.display='none';
  const reroll=document.getElementById('rw-reroll');
  if(reroll) reroll.style.display='none';
  const grade=document.getElementById('grade-up-btn');
  if(grade) grade.style.display='none';
  const pass=document.getElementById('btn-pass');
  if(pass) pass.style.display='none';
  const ally=document.getElementById('ally-section');
  if(ally) ally.style.display='';
}
