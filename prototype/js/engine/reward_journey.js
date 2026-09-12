// reward_journey.js — 旅の進捗の計算・描画・デバッグ移動
// ステージ1だけ先頭が村（リーゼ＝ゲーム開始地点）。その分、**エルムの後**の通常戦闘を1つ減らす
// （通常の 5〜8＝4戦 → 6〜8＝3戦）。マス数は他ステージと同じ10で、ボス9・祭壇10も据え置き。
// エリートと街の位置が1つ後ろへずれるため、_waveBattleType()等はこのルートから引く。
const SCENE1_ROUTE=['city','battle','battle','elite','city','battle','battle','battle','boss','altar'];
function _journeyRouteForScene(scene){
  // オンライン対戦のステージ構成はサーバーが配る。クライアントで組み立てない。
  if(typeof G!=='undefined'&&G&&G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch){
    const st=OnlineMatch.getState();
    if(st&&Array.isArray(st.stageFlow)&&st.stageFlow.length){
      // 3回のカード選択は、旅の進捗では1つの一般戦闘マスにまとめる。
      // 実際の進行（formation×3→versus）はサーバー状態をそのまま使う。
      const displayRoute=[];
      st.stageFlow.forEach(type=>{
        const displayType=type==='formation'?'battle':(type==='versus'?'elite':type);
        if(displayType==='battle'&&displayRoute[displayRoute.length-1]==='battle') return;
        displayRoute.push(displayType);
      });
      return displayRoute;
    }
  }
  const data=typeof SCENE_FLOW_DATA!=='undefined'?SCENE_FLOW_DATA:null;
  if(scene===5) return data&&data.final||['city','battle','battle','boss'];
  if(scene===1) return (data&&data.scene1)||SCENE1_ROUTE;
  return data&&data.standard||['battle','battle','elite','city','battle','battle','battle','battle','boss','altar'];
}
function _journeyIconForNode(type){
  // オンライン対戦マス（versus）はエリートと同じアイコンで表示する（仕様）。
  return {versus:'elite.svg',elite:'elite.svg',city:'city.svg',boss:'boss.svg',altar:'altar.svg',tower:'altar.svg',finalBoss:'boss.svg'}[type]||'';
}
function _journeyNodeClass(type){
  if(type==='city'||type==='altar'||type==='tower') return 'large';
  if(type==='versus'||type==='elite'||type==='boss'||type==='finalBoss') return 'special';
  return '';
}
// 村／祭壇は「地域情報」シートの街の名前・塔の名前を表示する（sceneはステージ番号＝G._wave）。
// ステージ1の先頭の村だけはリーゼ＝シートのステージ0を参照する（idx=マスの並び順）。
function _journeyNodeLabel(type,scene,idx){
  if(typeof G!=='undefined'&&G&&G._onlineMode){
    if(type==='battle') return '編成';
    if(type==='elite'||type==='boss'||type==='finalBoss') return '戦闘';
  }
  const useRiese=type==='city'&&Number(scene)===1&&Number(idx)===0;
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(useRiese?0:(scene??(G&&G._wave))):null;
  if(type==='city') return String((info&&info.townName)||'村').trim()||'村';
  if(type==='altar') return String((info&&info.towerName)||'祭壇').trim()||'祭壇';
  return {battle:'一般戦闘',elite:'エリート',boss:'ボス',finalBoss:'ラスボス'}[type]||'';
}
// 旅の進捗のSceneマーク（上段のアイコン列）のホバー表示。そのステージの塔の名前を出す。
// ステージ5のマークはそこへ到達するまで表示自体を出さないため、名前も伏せない。
function _journeySceneTowerName(scene){
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(scene):null;
  return String((info&&info.towerName)||'???').trim()||'???';
}
function _journeyDisplayPosition(route,stage,scene){
  const actual=Math.max(0,Math.min(route.length-1,stage-1));
  // ステージ1のstage1は「リーゼ滞在中」なので、先頭の村マスを点灯させる
  // （以前はゲーム開始前扱いで-1＝どこも点灯させていなかった）。
  if(actual===0) return 0;
  const special=type=>['elite','boss','finalBoss'].includes(type);
  // 次の戦闘が特殊戦の場合は、その一歩前を表示する。
  if(special(route[actual])){
    let idx=actual-1;
    while(idx>0&&special(route[idx])) idx--;
    return idx;
  }
  // 特殊戦を終えて直ちに村／祭壇へ移った場合は、特殊戦ではなく到達先を表示する。
  if(special(route[actual-1])) return actual;
  return actual-1;
}
// ── 「旅の進捗」枠の見出し（〜まであとX戦／〜に到達）──────────────────
// **文言はテキストメッセージシートが唯一の出どころ**（textMessage()）。
// シートの本文は「〜まであとX戦」「〜に到達」の形で、
//   〜 … 塔の名前（地域情報シート）
//   X … 残りの戦闘数（数字だけ太字で出す）
// 最終ステージだけは塔ではなく「最終決戦」に置き換える。
function _journeyCountdownHtml(towerName,remaining,reached,isFinalScene){
  const get=(key,fallback)=>(typeof textMessage==='function'?textMessage(key,fallback):fallback);
  const template=reached
    ?get('「編成画面、ショップ画面の旅の進捗枠」内 塔到達時','〜に到達')
    :get('「編成画面、ショップ画面の旅の進捗枠」内 通常時','〜まであとX戦');
  const name=isFinalScene?'最終決戦':String(towerName||'祭壇');
  // Xは数字だけを太字にする（前後の文字はシートの本文どおり）。
  return _escapePreviewHtml(template)
    .replace(/〜/g,_escapePreviewHtml(name))
    .replace(/X/,`<strong>${Math.max(0,Number(remaining)||0)}</strong>`);
}
function _syncRewardJourneyUi(options){
  const root=(options&&options.root)||document.getElementById('journey-progress-ui');
  if(!root||!G) return;
  const scene=Math.max(1,Math.min(5,Number(G._wave)||1));
  const route=_journeyRouteForScene(scene);
  let stage=Math.max(1,Math.min(route.length,Number(G._waveStage)||1));
  // オンラインのサーバー上は formation が3マス分あるが、表示上は1マスに集約する。
  // その間は一般戦闘マスを現在位置として維持し、マス自体を進めない。
  if(G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch){
      const st=OnlineMatch.getState();
    if(st&&Array.isArray(st.stageFlow)&&st.stageFlow.length){
      const rawStep=Math.max(0,Math.min(st.stageFlow.length-1,(Number(G._waveStage)||1)-1));
      let displayIdx=-1;
      let previousType=null;
      st.stageFlow.forEach((type,idx)=>{
        if(idx>rawStep) return;
        const displayType=type==='formation'?'battle':(type==='versus'?'elite':type);
        if(displayType!==previousType) displayIdx++;
        previousType=displayType;
      });
      if(displayIdx>=0) stage=displayIdx+1;
    }
  }
  const actual=stage-1;
  const current=options&&options.exactCurrent?actual:_journeyDisplayPosition(route,stage,scene);
  const currentType=route[actual];
  const isFinalScene=scene===5;
  const reached=isFinalScene?currentType==='boss':currentType==='altar';
  const remaining=route.slice(actual).filter(type=>['battle','elite','boss','finalBoss'].includes(type)).length;
  // 現在位置の次に進むノードを強調する。ゲーム開始前は先頭ノードを対象にし、
  // 祭壇（または最終決戦）へ到達済みのときは次ノードを発光させない。
  const next=(reached||current>=route.length-1)?-1:(current<0?0:current+1);

  // ステージ4まではScene1〜4だけを並べ、ステージ5へ到達した時点で末尾にScene5を足す。
  // （最終ステージの存在自体を、到達するまで伏せておくため）
  // ただしデバッグモードでは、どのステージにいてもScene5マークを出す
  // （Sceneマークを押してステージ移動できるようにするため）。
  const sceneCount=(scene>=5||(G&&G._debugMode))?5:4;
  const sceneMarks=Array.from({length:sceneCount},(_,idx)=>{
    const n=idx+1;
    const state=n<scene?'passed':(n===scene?'current':'');
    const connector=idx<sceneCount-1?`<span class="journey-track-line ${n<scene?'passed':''}"></span>`:'';
    // デバッグモードでは各Sceneマークを押してそのステージ（=G._wave）へ移動できるようにする。
    const jumpAttr=(G&&G._debugMode)?` data-journey-scene="${n}"`:'';
    // ホバー表示はブラウザ標準のtitleではなくカードと同じ枠（#kw-tooltip）で塔の名前を出す。
    // 名前だけの1行表示なので、data-preview-norule で見出し下の直線を消す。
    return `<span class="journey-scene-mark ${state}" data-preview="${_escapePreviewHtml(_journeySceneTowerName(n))}" data-preview-norule="1"${jumpAttr}></span>${connector}`;
  }).join('');
  const nodeMarks=route.map((type,idx)=>{
    const state=idx<current?'passed':(idx===current?'current':'');
    const resumeClass=options&&options.resume&&idx===current?'run-resume-current':'';
    const nextClass=idx===next?'next':'';
    const icon=_journeyIconForNode(type);
    const iconHtml=icon?`<img src="assets/ui/${icon}" alt="${_journeyNodeLabel(type,scene,idx)}">`:'';
    const connector=idx<route.length-1?`<span class="journey-track-line ${idx<current?'passed':''}"></span>`:'';
    const iconClass=icon?'has-icon':'';
    const iconStyle=icon?` style="--journey-icon:url('assets/ui/${icon}')"`:'';
    // エリート/ボスは、実際に出現する個体を先読み確定した上で「エリート／カード名」＋効果＋
    // カード画像＋ATK/HPをホバー表示する（data-journey-enemyに詰めてrender.js側で描画）。
    let previewText=_journeyNodeLabel(type,scene,idx);
    let enemyAttr='';
    if(!options?.resume&&!(G&&G._onlineMode)&&(type==='elite'||type==='boss'||type==='finalBoss')&&typeof _ensureWaveEnemyPreview==='function'){
      const previewType=type==='elite'?'elite':'boss';
      const enemyPreview=_ensureWaveEnemyPreview(scene,previewType);
      if(enemyPreview&&enemyPreview.def){
        const def=enemyPreview.def;
        const label=previewType==='elite'?'エリート':'ボス';
        previewText=`${label}\n${def.name}`;
        const artPaths=typeof getCharacterNoArtPath==='function'?getCharacterNoArtPath(def):'';
        const payload={
          name:def.name,desc:String(def.desc||'').trim(),atk:enemyPreview.atk,hp:enemyPreview.hp,art:artPaths||null,
          // 通常カードと同じく、効果テキストの一番上にキーワードを並べて表示する。
          keywords:[...new Set((def.keywords||[]).map(k=>String(k||'').trim()).filter(Boolean))],
          // 他のカードと同じ見た目（フレーム＋絵柄＋ATK/HP）でmkCardEl()に渡すための情報。
          artCode:def.artCode||def._artCode||def.No||def['No.']||def.no||def.imageNo||'',
          color:def.color||'',
          _sheetEnemy:!!def._sheetEnemy,
          // 旅の進捗のホバー表示でも、エリート／ボスは boss_frame.svg を使う。
          _isEliteOrBoss:true,
        };
        enemyAttr=` data-journey-enemy="${_escapePreviewHtml(JSON.stringify(payload))}"`;
      }
    }
    // デバッグモードでは各マスをクリックしてそのstageへ直接ジャンプできるようにする。
    const jumpAttr=(G&&G._debugMode&&!options?.resume)?` data-journey-jump="${idx+1}" data-journey-type="${type}"`:'';
    // エリート／ボス（カード付き）以外は名前だけの1行表示なので、Sceneマークと同じ枠にする
    // （見出し下の直線なし・幅は文字なり）。
    const noRuleAttr=enemyAttr?'':' data-preview-norule="1"';
    return `<span class="journey-node ${_journeyNodeClass(type)} ${iconClass} ${state} ${nextClass} ${resumeClass}"${iconStyle} data-preview="${_escapePreviewHtml(previewText)}"${enemyAttr}${noRuleAttr}${jumpAttr}>${iconHtml}</span>${connector}`;
  }).join('');
  // 「祭壇」は地域情報シートの「塔の名前」に置き換える（例：碧翠の塔まであと3戦／碧翠の塔に到達）。
  const _regionInfo=typeof regionInfoForWave==='function'?regionInfoForWave(scene):null;
  const towerName=String((_regionInfo&&_regionInfo.towerName)||'祭壇').trim()||'祭壇';
  const onlineState=(G&&G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch)
    ?OnlineMatch.getState():null;
  const onlineOpponent=onlineState&&onlineState.nextOpponentId?String(onlineState.nextOpponentId):'';
  const countdown=onlineOpponent
    ?`次の対戦相手は${_escapePreviewHtml(onlineOpponent)}`
    :_journeyCountdownHtml(towerName,remaining,reached,isFinalScene);
  root.innerHTML=`<div class="journey-scene-track">${sceneMarks}</div><div class="journey-countdown ${reached?'reached':''}">${countdown}</div><div class="journey-node-track">${nodeMarks}</div>`;
  if(G&&G._debugMode&&!options?.resume) _bindDebugJourneyJump(root);
}
// デバッグ専用：旅の進捗のSceneマーク（countdownの上のアイコン列）をクリックして
// そのステージ（=G._wave）へ移動する。移動後も編成画面のままにする。
function _bindDebugSceneJump(root){
  root.querySelectorAll('[data-journey-scene]').forEach(mark=>{
    mark.classList.add('journey-scene-mark-debug-jump');
    mark.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const wave=Math.max(1,Math.min(5,Number(mark.dataset.journeyScene)||1));
      // ステージ1の先頭マスは村（リーゼ＝シートのステージ0）なので、G._waveは0で表す。
      // 旅の進捗のscene計算はMath.max(1,G._wave)なので、0でもステージ1として表示される。
      G._wave=wave===1?0:wave;
      G._waveStage=1;
      G._waveBattleType=null;
      G._mapBattle=null;
      G._waveEliteWon=false;
      G.floor=typeof _waveStageFloor==='function'?_waveStageFloor(wave,1):G.floor;
      // 編成画面のまま留まる（戦闘・村へは遷移しない）。
      if(typeof _openWaveFormation==='function') _openWaveFormation();
      else _syncRewardJourneyUi();
    };
  });
}
// デバッグ専用：旅の進捗のマスをクリックしてそのstageへ即移動する。
function _bindDebugJourneyJump(root){
  _bindDebugSceneJump(root);
  root.querySelectorAll('[data-journey-jump]').forEach(node=>{
    node.classList.add('journey-node-debug-jump');
    // **押される前に、飛び先の曲を読み込んでおく。**
    // デバッグのマス移動は通常の進行と違って先読みの猶予が無く、
    // BGM（Web Audio）は波形を全部読んでから鳴るため曲の頭が無音になる。
    node.onpointerenter=()=>{
      if(typeof warmBgm!=='function') return;
      const stage=Number(node.dataset.journeyJump)||1;
      const type=String(node.dataset.journeyType||'');
      if(type==='altar'){ warmBgm('tower'); return; }
      if(type==='city') return; // 街の曲はopenMapVillage()側で入場演出中に読む
      if(typeof _battleBgmKeyForStage==='function') warmBgm(_battleBgmKeyForStage(stage));
    };
    node.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const stage=Number(node.dataset.journeyJump)||1;
      const type=String(node.dataset.journeyType||'');
      // マスは「いま表示しているステージ（scene）」のもの。G._waveをsceneへ合わせてから飛ぶ。
      // これをしないと、リーゼ滞在中（G._wave=0）にエルムのマスを押した時に
      // waveが0のまま=地域情報のステージ0＝リーゼが開いてしまう。
      const scene=Math.max(1,Math.min(5,Number(G&&G._wave)||1));
      // ステージ1の先頭マスだけはリーゼ（シートのステージ0）。
      G._wave=(scene===1&&type==='city'&&stage===1)?0:scene;
      // 施設系は専用の開き方、戦闘系（通常/エリート/ボス/ラスボス）は_startWaveBattleで即開始。
      if(type==='city'){ if(typeof _openWaveVillage==='function') _openWaveVillage(stage,false); return; }
      if(type==='altar'){ if(typeof _openWaveAltar==='function') _openWaveAltar(stage); return; }
      if(typeof _startWaveBattle==='function') _startWaveBattle(stage);
    };
  });
}
