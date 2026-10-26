// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// 戦闘の後の会話・確認（闘技場の継戦確認、魔獣撃退依頼の魔狼の会話など）の間は、デバッグ用のボタンを出さない。
// 勝利後に phase が reward になる一方、通常の勝利演出を通らないため、右下のボタンが確認窓・会話の後ろに出ていた（2026-09-26）。
// battle-victory-pending は goToReward() で外れるので、通常の編成画面では従来どおり出る。
function debugButtonsSuppressed(){
  return !!((typeof G!=='undefined'&&G&&G._arenaActive)
    ||(typeof document!=='undefined'&&document.body&&document.body.classList.contains('battle-victory-pending')));
}
// ── キーワードツールチップ（KW_DESC_MAP は loader.js で effect_id シートから読み込み）──

(function _initKwTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  const mapTip=()=>document.getElementById('map-power-tooltip');
  const keywordTip=()=>document.getElementById('keyword-tooltip');
  const hideTips=()=>{
    // アイテム／指輪をクリックした後は、通常のmousemoveによるホバー解除を止める。
    if(tip.dataset.rewardLocked==='1') return;
    tip.style.display='none';
    const mt=mapTip(),kt=keywordTip();
    if(mt) mt.style.display='none';
    if(kt) kt.style.display='none';
  };
  // ドラッグ中はホバー説明を出さない。ただしこのフラグが立ちっぱなしになると
  // 以後ホバー説明が一切出なくなるため、解除の経路を多重化しておく。
  // ※HTML5ドラッグ中はmouseupが発火しない。さらに、ドロップ成功で再描画が走り
  //   ドラッグ元の要素がDOMから作り直されるとdragendも発火しないことがある
  //   （reward.jsの指輪ドロップ等）。その場合フラグが戻らず、戦闘中にキャラへ
  //   ホバーしても説明が出ない状態になる。
  let _dragging=false;
  document.addEventListener('dragstart',()=>{ _dragging=true; hideTips(); }, true);
  document.addEventListener('dragend',()=>{ _dragging=false; }, true);
  document.addEventListener('drop',()=>{ _dragging=false; }, true);
  // 同じ理由（ドロップ成功→再描画→dragendが来ない）で、カーソル追従の複製（.drag-ghost）が
  // 画面に残り続けることがある。残ると「置いたカードがその場に貼り付いて動かない」ように見える
  // （例：店の売切枠へ魔導板のカードを置いた直後）。ドロップ後に必ず片付ける。
  // ※各ドロップ処理より後に走らせたいのでバブリング側で登録する。
  document.addEventListener('drop',()=>{
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
  });
  document.addEventListener('mouseup',()=>{ _dragging=false; }, true);
  document.addEventListener('mousemove',e=>{
    if(tip.dataset.rewardLocked==='1') return;
    // 保険：ボタンを押していないmousemoveが来た時点でドラッグは終わっている。
    // HTML5ドラッグ中はmousemoveが発火しないので、これでドラッグを誤って打ち切ることはない。
    if(_dragging&&e.buttons===0) _dragging=false;
    if(_dragging){ hideTips(); return; }
    const tgt=e.target&&e.target.closest?e.target:null;
    const cardPreviewEl=tgt&&tgt.closest('[data-preview]');
    const journeyEnemyEl=tgt&&tgt.closest('[data-journey-enemy]');
    const panelPreviewEl=tgt&&tgt.closest('[data-panel-power-preview]');
    const mapPreviewEl=tgt&&tgt.closest('[data-map-power-preview]');
    const keywordPreviewEl=tgt&&tgt.closest('[data-keyword-preview]');
    // ホバー説明はカーソルではなく、カード／指輪／アイテム／旅アイコンの実寸を基準に置く。
    const _journeyTipAnchor=tgt&&tgt.closest('.journey-scene-mark,.journey-node');
    // **所持金・ライフ・マナ・血の説明は、枠の15px上の中央に固定する。**（利用者指定）
    // セーフゾーンに掛かる時は下へ回さず、内側へずらす。
    const _statusTipAnchor=!_journeyTipAnchor&&tgt&&tgt.closest('[data-preview-status]');
    // 上にカードが無い特殊マス（空きマス .card-empty に特殊マス説明が付く）も、キャラと同じくマスの横に置く。
    // 含めないとカーソル位置に出ていた。
    const _sideTipAnchor=!_journeyTipAnchor&&!_statusTipAnchor&&tgt&&tgt.closest(
      '.item-visual,.ring-visual,[data-tip-below],.card,.card-empty,.rew-card,.slot,.debug-palette-item');
    // 右クリックのぞき見（right-card-peek）は魔導板カードを透明化する機能なので、
    // その挙動（カード自身の説明を出さずマスの説明だけ出す）も魔導板の範囲に限定する。
    // body全体で判定すると、のぞき見中に報酬カード・デバッグカードへホバーしても
    // data-previewが無視されて説明が消えてしまっていた。
    const isGameoverBoard=!!(tgt&&tgt.closest('#gameover-board-grid'));
    const isPanelPeek=!!(document.body&&document.body.classList.contains('right-card-peek'))
      &&!!(tgt&&tgt.closest('#hand-slots.board-slots,#gameover-board-grid'));
    // 右クリックのぞき見中は、透明化したカード自身の説明へフォールバックしない。
    // 特殊マスがある場合だけ、そのマスの説明を表示する。
    const el=isPanelPeek?panelPreviewEl:(cardPreviewEl||panelPreviewEl);
    if(!el&&!mapPreviewEl&&!keywordPreviewEl){ hideTips(); return; }
    const isKeywordDesc=!!(el&&el.hasAttribute('data-kwdesc'));
    // 右クリックのぞき見中、マス自体（召喚の力など）の説明はdata-panel-power-previewから出す。
    // このマスにレアリティはないため、上に置かれているカードのrarityクラスは適用しない。
    const isPanelPowerDesc=isPanelPeek&&!isKeywordDesc&&!!(el&&el.hasAttribute('data-panel-power-preview'));
    const isMapPowerDesc=isPanelPowerDesc||!!(el&&el.hasAttribute('data-panel-power-preview')&&!el.hasAttribute('data-preview'));
    const desc=(isMapPowerDesc&&el&&el.getAttribute('data-panel-power-preview'))
      ||(el&&!isPanelPeek&&el.getAttribute('data-preview'))
      ||(el&&el.getAttribute('data-kwdesc'))||(el&&el.getAttribute('data-panel-power-preview'))||(el&&el.getAttribute('data-preview'))||'';
    if(desc){
      const journeyEnemyJson=(el&&el===journeyEnemyEl)?el.getAttribute('data-journey-enemy'):'';
      const titleColor=el&&el.getAttribute('data-preview-title-color')||'';
      const noTitleRule=!!(el&&el.hasAttribute('data-preview-norule'));
      // デバッグカードはdata-previewを外側の一覧要素へ転記するため、closestだけでは
      // 内側のキャラクターカードを検出できない。内包カードも見て背景種別を決める。
      // **戦闘中のユニット（味方・敵とも .slot.unit-card）もキャラクター。** .character-card が付かないため、
      // 含めないと戦闘中のホバーだけ通常カードの茶色の背景になっていた。
      const isCharacterPreview=!!(el&&el.closest&&(el.closest('.character-card,.slot.unit-card')
        ||(el.querySelector&&el.querySelector('.character-card'))));
      tip.innerHTML=journeyEnemyJson?_formatJourneyEnemyHtml(desc,journeyEnemyJson)
        :(isMapPowerDesc?_formatMapPowerHtml(desc)
          :(noTitleRule?_formatTitleOnlyHtml(desc):_formatPreviewHtml(desc,{plainTitle:!isKeywordDesc,titleColor,sortEffects:isCharacterPreview})));
      tip.style.display='block';
      tip.className=tip.className.replace(/\brarity-\d\b/g,'').trim();
      tip.classList.remove('has-rarity-banner');
      tip.classList.toggle('map-tooltip',isMapPowerDesc);
      // キャラクターと旅の進捗内のエリート／ボスは、通常カードとは背景色を分ける。
      tip.classList.toggle('character-tooltip',isCharacterPreview);
      tip.classList.toggle('journey-enemy-tooltip',!!journeyEnemyJson);
      // data-preview-norule＝見出しだけの1行表示（旅の進捗のSceneマーク＝塔の名前）。
      // 枠はカードと同じまま、見出し下の直線だけを消す。
      tip.classList.toggle('no-title-rule',noTitleRule);
      // 所持金・ライフ・マナ・血の説明（data-preview-status）は、勝利・撤退の結果表示中も出す。
      // その画面ではカードの説明だけを止めたいので、印で見分ける（index.htmlのCSS）。
      tip.classList.toggle('status-tip',!!(el&&el.hasAttribute('data-preview-status')));
      if(!isMapPowerDesc){
        // 戦闘中のカードは説明文を上に重ねた透明な層（.unit-hit-layer）が持ち、rarity-N はカード本体（.slot.unit-card）に付く。
        // 説明文を持つ要素に無ければ、カード本体の rarity-N を使う（戦闘中だけ見出しが白かった。2026-09-28 利用者指摘）。
        const _rarityOf=node=>node&&node.classList?[...node.classList].find(c=>/^rarity-[1-6]$/.test(c)):null;
        const rarityClass=_rarityOf(el)||(el&&el.closest?_rarityOf(el.closest('.slot.unit-card')):null);
        if(rarityClass){
          tip.classList.add(rarityClass);
          // レアリティ装飾はカード本体ではなく、そのカードのホバー説明枠へ付ける。
          // 背景を説明枠の上辺中央へ置き、星をカードのレアリティ数だけ並べる。
          const rarity=Number(rarityClass.slice('rarity-'.length))||0;
          if(rarity&&typeof cardRarityBannerHtml==='function'
            &&el.closest('.card,.rew-card,.slot.unit-card,.debug-palette-item,.reward-prod-slots i.item-visual-filled,.reward-prod-slots i.ring-visual-filled')){
            tip.classList.add('has-rarity-banner');
            tip.insertAdjacentHTML('afterbegin',cardRarityBannerHtml({rarity}));
          }
        }
      }
      tip.style.display='block';
      // 種別クラスとレアリティを適用し終えて、最終的な文字寸法が確定してから置く。
      // 左端は従来のまま。下端は1emだった時の位置を維持して、左下基準で縮小する。
      const _previewColorIcon=tip.querySelector('.preview-title-color-icon');
      const _previewTitleText=tip.querySelector('.preview-title-text');
      const _previewTitle=_previewColorIcon&&_previewTitleText?_previewColorIcon.closest('.preview-title'):null;
      if(_previewColorIcon&&_previewTitleText&&_previewTitle){
        const _titleRect=_previewTitle.getBoundingClientRect();
        const _textRect=_previewTitleText.getBoundingClientRect();
        const _iconRect=_previewColorIcon.getBoundingClientRect();
        const _oldIconSize=parseFloat(getComputedStyle(_previewTitle).fontSize)||_iconRect.height;
        const _fixedBottom=_textRect.top-_titleRect.top+(_textRect.height+_oldIconSize)/2;
        _previewColorIcon.style.setProperty('left','0px','important');
        _previewColorIcon.style.setProperty('top',`${_fixedBottom-_iconRect.height}px`,'important');
        _previewColorIcon.style.setProperty('transform','none','important');
      }
      _posKwTip(tip,e);
    }else tip.style.display='none';

    // 特殊マスの説明は編成画面だけでなく、ショップ・鍛冶屋などの
    // 魔導板を表示している報酬フェイズでも表示する。
    const formationOnly=typeof G!=='undefined'&&(G.phase==='reward'||G.phase==='gameover');
    const mt=mapTip();
    // のぞき見中は#kw-tooltip側（tip）が既に同じ特殊マス説明を表示しているため、
    // #map-power-tooltipに同一内容を重ねて2つ表示しないようにする。
    if(mt&&formationOnly&&mapPreviewEl&&!isPanelPeek){
      mt.innerHTML=_formatMapPowerHtml(mapPreviewEl.getAttribute('data-map-power-preview')||'');
      mt.style.display='block';
    }else if(mt) mt.style.display='none';
    const kt=keywordTip();
    if(kt&&keywordPreviewEl&&!isPanelPeek){
      kt.innerHTML=_formatKeywordOnlyHtml(keywordPreviewEl.getAttribute('data-keyword-preview')||'');
      kt.style.display='block';
    }else if(kt) kt.style.display='none';
    // 常に「カード効果 → キーワード → 特殊マス」の順で縦に積み、
    // 3枠を1つのグループとして基準要素の中心に合わせる。
    const _groupTips=[tip,kt,mt];
    if(_statusTipAnchor){
      _positionTooltipGroup(_groupTips,_statusTipAnchor,'status-above');
    }else if(_journeyTipAnchor){
      _positionTooltipGroup(_groupTips,_journeyTipAnchor,'above');
    }else if(_sideTipAnchor){
      _positionTooltipGroup(_groupTips,_sideTipAnchor,'side');
    }else{
      let stackAnchor=tip.style.display==='block'?tip:null;
      if(kt&&kt.style.display==='block'){
        if(stackAnchor) _posTipRelative(kt,stackAnchor,'below',false);
        else _posKwTip(kt,e);
        stackAnchor=kt;
      }
      if(mt&&mt.style.display==='block'){
        if(stackAnchor) _posTipRelative(mt,stackAnchor,'below',false);
        else _posKwTip(mt,e);
      }
      _fitTooltipStack(_groupTips);
    }
  });
})();
// **ホバー説明の「：」の位置は、マナ効果（アイコンのラベル）以外の全行で揃える。**（利用者指定）
// 説明の中身を差し込む経路は複数ある（render.js の mousemove・reward_items.js の固定ホバーなど）ため、
// 各経路では揃えず、説明枠の中身が変わった時にここで一括して揃える。
// 説明枠はmousemoveのたびに中身を作り直すので、星5の虹と光の動きも文書の時刻へ合わせて途切れさせない。
(function _initPreviewLabelAlign(){
  const TIP_IDS=['kw-tooltip','map-power-tooltip','keyword-tooltip'];
  const align=(tip,observer)=>{
    tip.style.removeProperty('--preview-label-w');
    const labels=[...tip.querySelectorAll('.effect-trigger-label')]
      .filter(label=>!label.querySelector('img.desc-mana-icon'));
    labels.forEach(label=>{
      // **幅を揃えるのはタイミングのラベル（開戦〜終戦。マナ効果は除く）だけ。**（利用者指定）
      // キーワード説明（結界X・マナ効果など）まで揃えると、短いキーワード（根性など）の後ろに空白ができる。
      // 共通クラス effect-trigger-label の途中にも「trigger-」があるので、クラス単位で見る。
      label.classList.toggle('colon-aligned',[...label.classList].some(c=>/^trigger-/.test(c)&&c!=='trigger-mana'));
      // **説明本文は両端揃え（文字間を広げる）なので、折り返した行ではラベルと「：」の間まで広がり「：」がずれる。**
      // ラベルと「：」を1つの箱へ入れ、箱の中は広げさせない。
      if(label.parentElement&&label.parentElement.classList.contains('preview-label-box')) return;
      const colon=label.nextSibling;
      if(!colon||colon.nodeType!==3||!/^[：:]/.test(colon.nodeValue)) return;
      const box=document.createElement('span');
      box.className='preview-label-box';
      label.before(box);
      box.append(label,colon.nodeValue.slice(0,1));
      colon.nodeValue=colon.nodeValue.slice(1);
    });
    // 箱へ入れ替えた変更で自分が再び呼ばれないようにする。
    if(observer) observer.takeRecords();
    const width=labels.filter(label=>label.classList.contains('colon-aligned'))
      .reduce((max,label)=>Math.max(max,label.offsetWidth),0);
    if(width>0) tip.style.setProperty('--preview-label-w',`${width}px`);
    if(typeof tip.getAnimations==='function'){
      tip.getAnimations({subtree:true}).forEach(anim=>{
        if(/^rarity5-/.test(anim.animationName||'')) anim.startTime=0;
      });
    }
  };
  const start=()=>{
    TIP_IDS.forEach(id=>{
      const tip=document.getElementById(id);
      if(!tip||tip._previewLabelAlign) return;
      tip._previewLabelAlign=true;
      new MutationObserver((_,observer)=>align(tip,observer)).observe(tip,{childList:true,subtree:true});
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
// **cursor1 の所でボタンを押している間は cursor2 にする。指先の位置は cursor1 と揃える。**（利用者指定）
// cursor2.svg は width/height を持たず、そのままカーソルに使うと大きさが定まらない（ブラウザのカーソルに戻ることがある）。
// 読み込んで viewBox の寸法を大きさとして付けてから --cursor-press へ入れる。
// HOTSPOT＝cursor2 の指先から指の向きに1px内側（cursor1 の「8 1」と同じ取り方。指は約15°左へ傾いている）。
(function _initPressCursor(){
  const SRC='assets/ui/cursor2.svg?v=cursor02';
  const HOTSPOT={x:2,y:1};
  const root=document.documentElement;
  if(typeof fetch==='function') fetch(SRC).then(r=>r.ok?r.text():'').then(text=>{
    const open=text.match(/<svg\b[^>]*>/i);
    if(!open) return;
    let tag=open[0];
    const vb=(tag.match(/viewBox="([^"]+)"/)||[])[1];
    if(vb&&!/\swidth=/.test(tag)){
      const [,,vw,vh]=vb.trim().split(/[\s,]+/).map(Number);
      tag=tag.replace(/^<svg\b/i,`<svg width="${vw}" height="${vh}"`);
    }
    const svg=text.replace(/<\?xml[^>]*>\s*/,'').replace(open[0],tag);
    root.style.setProperty('--cursor-press',
      `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${HOTSPOT.x} ${HOTSPOT.y}, auto`);
  }).catch(()=>{});
  const release=()=>root.classList.remove('cursor-pressing');
  document.addEventListener('pointerdown',e=>{
    if(e.button!==0) return;
    const target=e.target instanceof Element?e.target:null;
    // 押し始めの所のカーソルが cursor1 の時だけ（掴めるカードの cursor3 は変えない）。
    if(target&&/cursor1\.svg/.test(getComputedStyle(target).cursor)) root.classList.add('cursor-pressing');
  },true);
  ['pointerup','pointercancel','dragstart'].forEach(type=>document.addEventListener(type,release,true));
  window.addEventListener('blur',release);
})();
// **何もない所をクリックした時の白く細い波紋。**（利用者指定）
// 「何もない所」＝ボタン・リンク・掴めるカードでなく、自分にも祖先にもクリック処理（onclick）が無い所。
// ボタン上でもカーソルは cursor1 のままなので、カーソルでは判定できない。
const _CLICK_RIPPLE_INTERACTIVE='button,a[href],[role="button"],[draggable="true"],input,select,textarea,label';
(function _initClickRipple(){
  document.addEventListener('click',e=>{
    if(e.button!==0||(!e.clientX&&!e.clientY)) return;
    const target=e.target instanceof Element?e.target:null;
    if(!target||target.closest(_CLICK_RIPPLE_INTERACTIVE)) return;
    for(let el=target;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
      if(typeof el.onclick==='function') return;
    }
    const ripple=document.createElement('div');
    ripple.className='click-ripple';
    ripple.style.left=`${e.clientX}px`;
    ripple.style.top=`${e.clientY}px`;
    ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
    document.body.appendChild(ripple);
    setTimeout(()=>ripple.remove(),1000);  // animationend が来なかった時の保険
  });
})();
function _getAllyDomSlots(){
  const arr=[];
  [...(document.getElementById('f-ally')?.querySelectorAll('.slot')||[])].forEach((slot,pos)=>{
    const idx=slot.dataset&&slot.dataset.unitIdx!=null?parseInt(slot.dataset.unitIdx,10):pos;
    arr[idx]=slot;
  });
  return arr;
}

// スロット高さをCSSカスタムプロパティに反映（リサイズ対応）
function _updateLaneOffset(){
  // 実在スロットが計測できれば最も正確
  const anyRow=document.getElementById('f-ally')||document.getElementById('f-enemy');
  const anySlot=anyRow&&anyRow.querySelector('.slot');
  if(anySlot){
    const h=anySlot.getBoundingClientRect().height;
    if(h>0){
      document.documentElement.style.setProperty('--_slot-h',h+'px');
      document.documentElement.style.setProperty('--lane-rear-top',Math.round(h*0.67)+'px');
      return;
    }
  }
  // フォールバック：max-width:1100px を考慮した計算
  const W=Math.min(document.documentElement.clientWidth,1100);
  const slotH=(W-49)/7*88/63;
  document.documentElement.style.setProperty('--_slot-h',Math.round(slotH)+'px');
  document.documentElement.style.setProperty('--lane-rear-top',Math.round(slotH*0.67)+'px');
}

// ── 攻撃ライン描画 ──
(function _initAttackLineSvg(){
  if(document.getElementById('atk-line-svg')) return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id='atk-line-svg';
  svg.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(svg);
})();


function hideAttackLine(){
  const svg=document.getElementById('atk-line-svg');
  if(svg) svg.innerHTML='';
}

// DOMRectを保持する時は、必要な4値だけを同じ順番で写す。
// 矩形の取得時点と有効性の判定は呼び出し側で決める。
function _copyBattleVisualRect(rect){
  return {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
}

function getCurrentUnitSlot(side,idxOrUnit){
  const field=document.getElementById(side==='enemy'?'f-enemy':'f-ally');
  if(!field) return null;
  const list=side==='enemy'?G.enemies:G.allies;
  const isMeasurable=slot=>{
    if(!slot||typeof slot.getBoundingClientRect!=='function') return !!slot;
    const r=slot.getBoundingClientRect();
    return !!(r&&r.width>0&&r.height>0);
  };
  // コアイベントの再生では、state.units由来のオブジェクトとG配列上の
  // 実体が別参照になることがある。FLIP後の実DOMはunitIdを正として
  // 解決し、VFX・攻撃モーション・召喚完了判定の対象を一致させる。
  const unitId=idxOrUnit&&typeof idxOrUnit==='object'&&idxOrUnit.id!=null
    ?String(idxOrUnit.id):null;
  if(unitId){
    const byId=[...field.querySelectorAll('.slot[data-unit-id]')]
      .find(slot=>String(slot.dataset.unitId||'')===unitId);
    // IDが一致していても、非表示の旧枠（実寸0）は現在位置として返さない。
    // 召喚直後などにそこを攻撃先へ使うと、複製カードが画面左上へ飛ぶ。
    if(byId&&isMeasurable(byId)) return byId;
    // 詰め直し後の同じ添字は別の体。ID指定では旧枠・別キャラを複製元にしない。
    return null;
  }
  const idx=typeof idxOrUnit==='number'?idxOrUnit:list.indexOf(idxOrUnit);
  if(idx<0) return null;
  const found=field.querySelector(`.slot[data-unit-idx="${idx}"]`)||
    field.querySelectorAll('.slot')[idx]||
    null;
  // 死亡後の空きスロットは7枠等間隔の位置にあり、生存時の中央寄せとは別の場所にある。
  // ここを「そのキャラの居場所」として返すと、数値・VFX・攻撃モーションが
  // 何もない場所へ出る。キャラ指定での解決では空きスロットを返さない。
  if(found&&typeof idxOrUnit==='object'&&found.classList&&found.classList.contains('dead-empty')) return null;
  // 表示されていない枠（大きさ0）を居場所として返すと、攻撃モーション・VFX・数値が画面の左上（0,0）へ向かう。
  // 敵が大量に並んだ時（召喚で枠が足りない時）に起きていた（2026-09-27 利用者指摘）。
  if(found&&!isMeasurable(found)) return null;
  return found;
}

// 保留している「効果発動時の発光」を、VFXが出るこの瞬間に合わせて始める。
// **規則は present_events.js が唯一の実装**（ここは受け口を各VFXの入口へ置くだけ）。
function _syncEffectFlashWithVfx(){
  if(typeof actionBannerStartScope==='function') actionBannerStartScope();
  if(typeof presentFlushEffectFlashes==='function') presentFlushEffectFlashes();
}

// **発光中のユニットを覚えておく唯一の場所。**
// 発光はカードのDOM要素にクラスを付けて見せるが、その要素は
// 再描画（renderField）と攻撃モーションの開始・終了で作り直される／消える。
// 開始時に掴んだ要素へ付けたままにすると、途中で作り直された瞬間に光が消える
// （＝「攻撃効果の黄色い発光が見えないことがある」）。
// 光っている間はここに残し、renderField が新しいスロットへ付け直す。
const EFFECT_FLASH_STEP_MS=180;
const _effectFlashActive=new Map(); // unitId -> {color, until, token}
function _effectFlashStateFor(unit){
  const id=unit&&unit.id!=null?String(unit.id):'';
  if(!id) return null;
  const st=_effectFlashActive.get(id);
  if(!st) return null;
  if(st.until<=Date.now()){ _effectFlashActive.delete(id); return null; }
  return st;
}
// 再描画で作り直したスロットへ、まだ光っているなら光を付け直す。
function _reapplyEffectFlash(el, unit){
  const st=_effectFlashStateFor(unit);
  if(!el||!st) return false;
  el.dataset.effectFlashColor=st.color;
  el.classList.add('effect-flash');
  return true;
}
// 効果の発生元を一瞬だけ発光させる（魔導板の接続カードホバーと同じカード周囲の光）。
// count回の発動は、クラスを付け直して明滅として見せる。
async function playEffectFlash(unit, side, color, count){
  const n=Math.max(1,Number(count)||1);
  const unitId=unit&&unit.id!=null?String(unit.id):'';
  const flashColor=String(color||'white');
  // **光らせる先は毎回引き直す。** 攻撃効果は攻撃モーション中に発動するため、
  // 元カードは隠れていて、見えているのは移動中の複製。その複製はモーションが
  // 終わると消えるので、掴みっぱなしにすると途中で光が消える。
  const resolveTargets=()=>{
    const slot=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,unit):null;
    const clone=unitId?[...document.querySelectorAll('.attack-motion-clone[data-unit-id]')]
      .find(el=>String(el.dataset.unitId||'')===unitId):null;
    return [clone,slot].filter((el,i,a)=>el&&a.indexOf(el)===i);
  };
  if(!resolveTargets().length) return false;
  const token={};
  if(unitId) _effectFlashActive.set(unitId,{color:flashColor,until:Date.now()+n*EFFECT_FLASH_STEP_MS+40,token});
  for(let i=0;i<n;i++){
    resolveTargets().forEach(el=>{
      el.dataset.effectFlashColor=flashColor;
      el.classList.remove('effect-flash');
      void el.offsetWidth;
      el.classList.add('effect-flash');
    });
    await new Promise(resolve=>setTimeout(resolve,EFFECT_FLASH_STEP_MS));
  }
  // **後から始まった発光を消さない。** 同じキャラが続けて光る時、
  // 先に始めた方の後片付けで後の光まで消えるのを防ぐ。
  if(unitId&&_effectFlashActive.get(unitId)?.token!==token) return true;
  if(unitId) _effectFlashActive.delete(unitId);
  // 掴んだ要素だけでなく、このユニットのidを持つ要素から漏れなく外す
  // （再描画で付け直された新しいスロットも対象にする）。
  document.querySelectorAll('.effect-flash').forEach(el=>{
    const id=String(el.dataset.unitId||'');
    if(unitId&&id&&id!==unitId) return;
    if(unitId&&!id&&!resolveTargets().includes(el)) return;
    el.classList.remove('effect-flash');
    delete el.dataset.effectFlashColor;
  });
  return true;
}

// ── 攻撃範囲の接触演出（貫通の既存素材／三方向攻撃の既存素材／全体攻撃の既存素材）──────
// **ここが唯一の描画実装**（PvE・オンライン共通）。呼ぶのは接触した瞬間で、
// 呼び出し側は完了を待たない（待つと複数対象のダメージ数値の時刻がずれる）。
// 大きさ・位置のつまみは present.js（PRESENT_CONTACT_*）が唯一の定義。
// 全体攻撃の範囲：相手の盤面の横幅いっぱい × 敵がいる列（前衛／後衛）の縦の範囲。敵の数・位置で変えない。
function _attackAllFxBox(list,side){
  const field=document.getElementById(side==='enemy'?'f-enemy':'f-ally');
  if(!field||typeof _captureUnitDamageRect!=='function') return null;
  const fr=field.getBoundingClientRect();
  const rects=list.map(u=>_captureUnitDamageRect(u,side)).filter(r=>r&&r.width>0&&r.height>0);
  if(!rects.length||!(fr.width>0)) return null;
  const top=Math.min(...rects.map(r=>r.top)),bottom=Math.max(...rects.map(r=>r.top+r.height));
  return {left:fr.left,top,width:fr.width,height:bottom-top};
}
async function playAttackContactVfx({attacker, targets, targetSide, mode, path, duration, fadeDuration, onPass}){
  _syncEffectFlashWithVfx();
  const list=(targets||[]).filter(Boolean);
  // 2026-10-20 利用者指定：敵が前衛だけ・後衛だけの時は、列を交差する光刃ではなく「白い芯の横一閃」（同じSE）。
  if(mode==='all'){
    const lanes=new Set(list.map(u=>u&&u.lane==='rear'?'rear':'front'));
    const sweep=list.length>1&&lanes.size===1;
    // 2026-10-21 利用者指定：攻撃キャラに追従させず、敵の数で大きさを変えない。
    // 前衛・後衛がいれば相手の盤面全体（最大の大きさ）に交差する光刃、前衛か後衛だけならその列の最大の幅に横一閃。
    const side=targetSide||((list[0]&&list[0].side==='p2')?'enemy':'ally');
    const box=_attackAllFxBox(list,side);
    // 発生元は攻撃キャラの盤面の定位置を固定の四角で渡す（向きは従来どおり、動く複製には付いていかない）。
    const home=attacker&&typeof _captureUnitDamageRect==='function'
      ?_captureUnitDamageRect(attacker,side==='enemy'?'ally':'enemy'):null;
    return playBattleLabFx(sweep?'K009_SWEEP':getKeywordAssetKey('全体攻撃'),attacker,list,
      {...(home?{sourceRect:{...home,element:null}}:{}),...(box?{targetsBox:box}:{})});
  }
  if(!list.length||!path||typeof playHitVfxAtRect!=='function') return false;
  const side=targetSide||((list[0].side==='p2')?'enemy':'ally');
  const rectOf=unit=>typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(unit,side):null;
  const scaleOf=(name,fallback)=>{
    const n=Number(typeof window!=='undefined'?window[name]:undefined);
    return Number.isFinite(n)?n:fallback;
  };
  // コード描画の基準幅は入れ物そのもの。接触の幅・位置の指定はpresent.jsに保つ。
  const cssRatio=1;
  const opts=path=>({customVfxPath:path,hitDuration:duration,fadeDuration,waitForFinish:true,gateMs:0,rotation:0});

  // 貫通：**攻撃者から対象へ向かう角度のまま**、対象カードの上を通って
  // 後ろの敵を貫き、画面外まで飛ぶ。当たったキャラクターには、絵がその位置を
  // 通り過ぎた瞬間にダメージを見せる（onPass）。
  // 入れ物（host）の幅はpresent.jsの接触幅に合わせる。
  // 対象の矩形をそのまま入れ物にすると、縦長素材（137x1086）が画面の高さを超えて
  // 伸び、画面の下から現れたように見える。
  if(mode==='pierce'&&typeof playCurvedMissile==='function'){
    const rects=list.map(u=>({unit:u,rect:rectOf(u)})).filter(x=>x.rect);
    if(!rects.length) return false;
    const hitRect=rects[0].rect;
    const attackerRect=attacker&&typeof _captureUnitDamageRect==='function'
      ?_captureUnitDamageRect(attacker,side==='enemy'?'ally':'enemy'):null;
    const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
    const hitC=center(hitRect);
    // 進む向き＝攻撃者から**一番奥の対象**への向き。
    // 対象が1体なら攻撃者→対象の向き（＝キャラクターの角度）そのまま。
    // 手前の対象だけを見て向きを決めると、**線が通っていない後衛にダメージが入る**
    // ように見える（貫く相手は必ず線の上に来るようにする）。
    const deepC=center(rects[rects.length-1].rect);
    const fromC=attackerRect?center(attackerRect)
      :{x:deepC.x,y:deepC.y+(side==='enemy'?1:-1)*(hitRect.height||1)};
    let vx=deepC.x-fromC.x, vy=deepC.y-fromC.y;
    if(Math.hypot(vx,vy)<1){ vx=hitC.x-fromC.x; vy=hitC.y-fromC.y; }
    const len=Math.hypot(vx,vy)||1;
    vx/=len; vy/=len;
    const startOffset=scaleOf('PRESENT_CONTACT_PIERCE_START_OFFSET',.5);
    const overshoot=scaleOf('PRESENT_CONTACT_PIERCE_OVERSHOOT',1.2);
    const hostW=Math.max(1,hitRect.width*scaleOf('PRESENT_CONTACT_PIERCE_WIDTH',.55)/cssRatio);
    // 出現位置＝対象カードから手前側へ少し戻した所。終点は画面の外。
    const reach=Math.max(window.innerWidth||1920,window.innerHeight||1080)*overshoot;
    // **発生位置は「攻撃者から一番奥の対象へ引いた線」の上に置く。**
    // 対象カードの中心から横へずらしていた頃は、線が対象と後衛の両方を通らず、
    // 左の前衛を攻撃した時だけ大きく左へ外れていた。
    const offsetX=hitRect.width*scaleOf('PRESENT_CONTACT_PIERCE_OFFSET_X',0);
    const toHit=Math.hypot(hitC.x-fromC.x,hitC.y-fromC.y);
    const along=Math.max(0,toHit-hitRect.height*startOffset);
    const sx=fromC.x+vx*along+offsetX, sy=fromC.y+vy*along;
    const box=(x,y)=>({left:x-hostW/2,top:y-hostW/2,width:hostW,height:hostW});
    // 素材の先端は上向き。atan2は右向きが0度なので+90する。
    const angle=Math.atan2(vy,vx)*180/Math.PI+90;
    const waypoints=rects.map(({unit,rect})=>({point:center(rect),
      onReach:()=>{ if(typeof onPass==='function') onPass(unit); }}));
    await playCurvedMissile({asset:path,sourceRect:box(sx,sy),targetRect:box(sx+vx*reach,sy+vy*reach),
      scale:1,flightMs:scaleOf('PRESENT_CONTACT_PIERCE_FLIGHT_MS',420),
      impactOffsetY:0,straight:true,fixedAngle:angle,waypoints});
    return true;
  }

  if(mode==='tri'){
    const rects=list.map(rectOf).filter(Boolean);
    if(!rects.length) return true;
    const left=Math.min(...rects.map(r=>r.left));
    const right=Math.max(...rects.map(r=>r.left+r.width));
    const top=Math.min(...rects.map(r=>r.top));
    const height=Math.max(...rects.map(r=>r.height));
    // 絵の幅＝対象3体の横幅×比。入れ物はそこから逆算する（対象の数で絵の大きさを変えない）。
    const drawW=Math.max(1,(right-left)*scaleOf('PRESENT_CONTACT_TRI_WIDTH',1.5));
    const hostW=drawW/cssRatio;
    // 中心は対象列の中央。絵の中で炎が右寄りなぶんを「絵の幅に対する比」で左へずらす。
    const cx=(left+right)/2+drawW*scaleOf('PRESENT_CONTACT_TRI_OFFSET_X',-.18);
    await playHitVfxAtRect({left:cx-hostW/2,top:top+height/2-hostW/2,width:hostW,height:hostW},0,
      {...opts(path),vfxScale:1});
    return true;
  }

  await Promise.all(list.map(unit=>{
    const rect=rectOf(unit);
    if(!rect) return Promise.resolve();
    return playHitVfxAtRect(rect,0,{...opts(path),vfxScale:2});
  }));
  return true;
}

function playUnitDeathBurn(unit,side){
  // **倒れたかは画面に出ているHPで見る。** PvEの体はコアの最終状態なので、倒れた後に復活して
  // 生き残った体は hp>0 のまま届き、焼失が出ずに復活の演出だけになっていた（オンラインは焼失→復活）。
  const shownHp=typeof presentShownHp==='function'?presentShownHp(unit):(unit&&unit.hp);
  if(!unit||shownHp>0||unit._deathFxDone) return false;
  if(typeof battleFxStopUnitStates==='function') battleFxStopUnitStates(unit);
  const slot=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,unit):null;
  if(!slot) return false;
  const rect=slot.getBoundingClientRect();
  if(!(rect.width>0&&rect.height>0)) return false;
  const clone=slot.cloneNode(true);
  unit._deathFxDone=true;
  // 2026-10-10：死亡用の複製へ切り替える瞬間に元枠を隠す。
  // .slot の transition:all .18s が visibility にも掛かると180ms両方見える。
  // 複製は上で確保済みなので、死亡演出の見た目・尺はそのままに元枠だけ遷移を切る。
  slot.style.setProperty('transition','none','important');
  slot.style.setProperty('visibility','hidden','important');
  _playUnitDeathCardFx(unit,clone,rect,{width:slot.offsetWidth,height:slot.offsetHeight});
  return true;
}

// **カードの消え方を選ぶのはここだけ。**
//   ダメージで倒れた            → 焼失（playCardBurnAway）
//   ダメージ以外でHPが0になった → 青い波打ち＋WASTED（playCardWaveAway）
// 印（_deathByStatDrain）は death.statChange を受けた共通の presentDeathBatch() が立てる。
// 死亡イベントだけを消失演出の入口にするため、戦闘修正の表示と二重には再生されない。
function _playUnitDeathCardFx(unit,node,rect,sourceSize){
  // 旧スロットの写しには、停止前に複製された毒などの局所キャンバスが含まれることがある。
  node.querySelectorAll('[data-vb-fx-local]').forEach(el=>el.remove());
  const drained=!!(unit&&unit._deathByStatDrain);
  if(unit) delete unit._deathByStatDrain;
  if(drained){
    playCardWaveAway(node,rect,sourceSize);
    // ATKが0で場を去る時の「FLED」と対になる表示。
    if(typeof playWastedLabel==='function') playWastedLabel(rect);
  }else{
    playCardBurnAway(node,rect,sourceSize);
  }
}

// 演出用ホストの追加先。戦闘中は画面内で縮尺を相殺する層に置き、
// 子へ渡すleft/top（getBoundingClientRect()の画面座標）は従来どおりに保つ。
// 背景（イラスト）が実際に描かれている範囲。#scr-battle は黒帯を含む全画面なので、
// そのまま使うと帯の上にVFXが出る。3840x2160を幅・高さに収めた実寸を返す。
function _battleVfxClipRect(){
  const frame=_battleBackgroundFrameRect();
  const w=Math.min(frame.width,frame.height*3840/2160);
  const h=w*2160/3840;
  return {left:frame.left+(frame.width-w)/2,top:frame.top+(frame.height-h)/2,width:w,height:h};
}

// **VFXは背景の外へ出さない。** 全画面の入れ物を1枚だけ作り、
// clip-path で背景の範囲へ切り抜く。入れ物は画面いっぱいなので、
// 中のhost（position:fixed・画面座標）の位置計算は今までのままでよい。
// clip-path は子孫（position:fixedも含む）の描画ごと切り抜く。
function _vfxClipLayerEl(id,zIndex){
  let layer=document.getElementById(id);
  if(!layer){
    layer=document.createElement('div');
    layer.id=id;
    Object.assign(layer.style,{position:'fixed',left:'0',top:'0',width:'100%',height:'100%',
      pointerEvents:'none',zIndex});
  }
  return layer;
}
function _vfxClipLayer(){
  if(typeof document==='undefined') return null;
  const screen=document.getElementById('scr-battle');
  const battleActive=!!(screen&&screen.classList.contains('active'));
  // 攻撃の動く複製（.attack-motion-clone）は body 直下の z=10000 にいる。戦闘画面の中（z=9999）に置いたままだと、
  // 攻撃中のVFXが動くカードの下へ回り込む（2026-10-20 利用者指摘）。複製がある間に作る演出は body 直下の
  // 別の入れ物（#vfx-frame-clip-top・z=10001）へ出す。
  // **入れ物そのものは付け替えない**（2026-10-23）。付け替えると中の CSS アニメーションが全て最初からやり直しになり、
  // 焼失中のカード（.death-burn-clone）が攻撃の始まり・戻りのたびに元の姿へ戻って焼け直す
  // ＝「既に死んだキャラの残像」になっていた（数値・波打ちなども同じ）。作り済みの演出は作った入れ物に置いたままにし、
  // 毎コマこの関数を呼ぶ VbFx の描画面（中身は毎コマ描き直す canvas 1枚）だけを今の入れ物へ移す。
  // 起動の切断カードもbody直下のz=10000。剣戟がカードの下に隠れないよう同じ上層を使う。
  const motionClone=battleActive&&!!document.querySelector('.attack-motion-clone,.activation-cut-half');
  const layer=_vfxClipLayerEl('vfx-frame-clip','10035');
  if(battleActive){
    // 結果カットイン(z=10000)・行動表示(z=10002)より下。既存VFXの画面座標・寸法を保つ。
    const base=screen.getBoundingClientRect(),scale=_gameScale()||1;
    Object.assign(layer.style,{position:'absolute',left:`${-base.left/scale}px`,top:`${-base.top/scale}px`,
      width:`${window.innerWidth}px`,height:`${window.innerHeight}px`,zIndex:'9999',transformOrigin:'0 0',transform:`scale(${1/scale})`});
    if(layer.parentNode!==screen) screen.appendChild(layer);
  }else{
    Object.assign(layer.style,{position:'fixed',left:'0',top:'0',width:'100%',height:'100%',zIndex:'10035',transform:'none'});
    if(layer.parentNode!==document.body) (document.body||document.documentElement).appendChild(layer);
  }
  const top=motionClone||document.getElementById('vfx-frame-clip-top')?_vfxClipLayerEl('vfx-frame-clip-top','10001'):null;
  if(top&&top.parentNode!==document.body) (document.body||document.documentElement).appendChild(top);
  const r=_battleVfxClipRect();
  const vw=window.innerWidth||r.width, vh=window.innerHeight||r.height;
  const clip=`inset(${Math.max(0,r.top)}px ${Math.max(0,vw-(r.left+r.width))}px `
    +`${Math.max(0,vh-(r.top+r.height))}px ${Math.max(0,r.left)}px)`;
  layer.style.clipPath=clip;
  if(top) top.style.clipPath=clip;
  const active=motionClone?top:layer;
  const fxRoot=document.querySelector('[data-vb-fx-layer]');
  if(fxRoot&&(fxRoot.parentNode===layer||fxRoot.parentNode===top)&&fxRoot.parentNode!==active) active.appendChild(fxRoot);
  return active;
}

function _vfxHostParent(){
  return _vfxClipLayer()||document.body;
}

// 勝利・敗北が確定した時点で、再生中の全VFX（ダメージ演出／特殊演出／薙ぎ払い演出）を
// 即座に打ち切ってDOMから除去する。演出用の各hostは常にdocument.body直下へfixedで
// 追加されるため、専用クラスで一括除去すればどの演出タイミングで戦闘が終わっても残らない。
function _forceStopAllVfx(options){
  // 終戦（勝利・撤退）では行動表示を消さずに残す（「進む」が出る時に消える。2026-10-06 利用者指定）。
  // ゲームオーバー・中断などは従来どおり消す。
  if(options&&options.keepActionBanner){ if(typeof actionBannerHold==='function') actionBannerHold(); }
  else if(typeof actionBannerClear==='function') actionBannerClear();
  // 終戦（勝利・撤退）では状態のループ表示を残す（2026-10-07 利用者指定）。
  if(typeof stopBattleLabFx==='function') stopBattleLabFx({keepStates:!!(options&&options.keepActionBanner)});
  if(typeof presentResetLabEvents==='function') presentResetLabEvents();
  const preserveDamage=!!(options&&options.preserveDamage);
  // 戦闘画面のVFXは複数の親（#vfx-clip-root／#scr-battle／body）に
  // 生成されるため、戦闘終了時は一時要素を種類を問わずまとめて除去する。
  // FLED／WASTED の文字もダメージ数値と同じ扱い。最後の1体を倒した時も読み切れるように、
  // 勝利確定（preserveDamage）では残す（自分で時間が来たら消える）。以前は勝利確定で即座に消され、
  // 最後の敵が毒・衰弱で死んだ時は WASTED が出なかった。
  const selectors=(preserveDamage?'':'.damage-vfx-host,.damage-label-host,.fled-label-host,')+
    '.effect-sustain-host,'+
    '.special-vfx-clip,.special-vfx-host,.sweep-vfx-clip,.sweep-vfx-host,'+
    '.attack-motion-clone,.death-burn-clone,.battle-opening-appearance-vfx,#battle-start-intro,'+
    // **キャラの上へ直接足した絵も消す。**（playVfxOnElement が付ける `.vfx`）
    // アニメーション終了で自分を消す作りだが、決着で盤面が描き直されたり
    // ループする素材だったりすると animationend が来ず、キャラの上に残り続ける
    // （敵が全滅した後も炎の矢の絵が乗ったままになる）。
    '#f-ally .vfx,#f-enemy .vfx,#f-ally .effect-sustain-host,#f-enemy .effect-sustain-host'
  document.querySelectorAll(selectors).forEach(el=>el.remove());
  // **ひと続きのマナ効果も必ず終わらせる。** DOMだけ消しても、
  // 「処理が終わるまで出し続ける」状態が残っていると次の戦闘へ持ち越され、
  // 決着後も効果のVFXが出続ける（開戦で敵が全滅した時に炎の矢が残っていた）。
  if(typeof _resetManaEffectRun==='function') _resetManaEffectRun();
  // 死亡演出のSVGフィルタ定義も次の画面へ持ち越さない。
  const deathFilters=document.getElementById('death-burn-filters');
  if(deathFilters) deathFilters.replaceChildren();
  if(window.__activeVfxPromises&&!preserveDamage) window.__activeVfxPromises.clear();
}

// ダメージ数値ラベルの表示時間。同じキャラクターへ連続してダメージを出す側
// （battle.js）が「前の数値が消えるまで待つ」ためにも使うので、式はここ1か所に置く。
function damageLabelDurationMs(labelDuration, minMs){
  const speedMul=(typeof G!=='undefined'&&G&&Number(G._effectVfxSpeedMultiplier))||1;
  // 同種のダメージを畳みかける時は、次の数値が出るまでに1回分の「出て消える」を
  // 収める必要があるため、既定の下限（600ms）を明示的に外せるようにする。
  const floor=Number.isFinite(Number(minMs))?Math.max(0,Number(minMs)):600;
  return Math.max(floor,(Number(labelDuration)||950)/speedMul);
}

// 同一URLの<img>を短時間に連続生成すると、ブラウザによっては再生状態が共有され
// ループ位置がずれて見える。それを避けるためURLへ印を付けるが、**毎回乱数にすると
// 常にキャッシュを外れ、命中のたびに画像を読み直して主スレッドが数百ms止まる。**
// （同じ瞬間に出るはずの数値が1体だけ先に出る／命中音がずれる原因になっていた）
// 画像URLへの印は利用者の指示で廃止した。番号はSEの重複防止キーと、
// 画像を使わない軌道の決定にだけ残している。
const VFX_VARIANT_COUNT=6;
let _vfxVariantSeq=0;
function _vfxVariantIndex(){ _vfxVariantSeq=(_vfxVariantSeq+1)%VFX_VARIANT_COUNT; return _vfxVariantSeq; }

// 定義データの共通再生。DOMは位置・尺・フェードを伝えるだけで、絵はVbFxが描く。
// 旧画像向けの倍率を標準のカード幅へ正規化し、明示した相対倍率は保つ。
let _definedVfxSeq=0;
function _definedVfxSize(code,scale){
  const base=typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(code):1;
  return (Number(scale)||base)/(base||1);
}
function _playDefinedVfx(host,value,durationMs,options){
  const opt=options||{};
  const name=typeof getVfxDefinitionName==='function'?getVfxDefinitionName(value):'';
  if(!host||!name||typeof VbFx==='undefined'||!VbFx.effects.some(d=>d.name===name)) return {stop:()=>{}};
  const key=`defined-vfx:${++_definedVfxSeq}`;
  host.dataset.codeVfx='1'; host.dataset.vfxDefinition=name;
  VbFx.settings.layer=typeof _vfxClipLayer==='function'?_vfxClipLayer:null;
  const speed=opt.presentationSpeed&&typeof getBattlePresentationSpeedScale==='function'
    ?getBattlePresentationSpeedScale():1;
  const promise=VbFx.play(name,{source:host,targets:[host],key,
    durationMs:Math.max(1,Number(durationMs)||700)/Math.max(.01,speed),
    size:Number(opt.size)||1,seed:53,dir:1,repeat:!!opt.repeat,
    followGeometry:true,followOpacity:true});
  promise.catch(e=>console.error('[VFX definition]',name,e));
  return {promise,stop:()=>VbFx.stop({name,key})};
}

// ── 効果そのもののVFXを1体の上に出す ──────────────────────
// 命中VFX（playHitVfxAtRect）は `characterEffect`（CXXX）しか引けないため、
// 強化カードの効果（活性化＝E045等）はこちらを使う。素材は `getEffectVfxPath()` が引く。
// 大きさ・追従は命中VFXと同じ規則を使う（present.js の presentCharacterVfxScale）。
//
// options.durationMs … 指定するとその時間で自動的に消える（効果1回ぶんの再生）。
//                      省略すると **停止するまで定義を繰り返す**。
// options.minDurationMs … 最低再生時間。stop() が早く呼ばれてもここまでは消さない。
//                      1回しか発動しない効果で一瞬しか映らないのを防ぐ。
// 戻り値の stop() はどちらの場合も呼んでよい（自動停止済みなら何もしない）。
//
// 素材が登録されていない効果では null を返す。呼び出し側は何も出さないこと
// （空のまま playHitVfxAtRect へ渡すと通常の被弾VFXへ化ける）。
function playEffectVfxOnUnit(unit,side,code,options){
  _syncEffectFlashWithVfx();
  if(!unit||typeof _captureUnitDamageRect!=='function') return null;
  const url=typeof getEffectVfxPath==='function'?getEffectVfxPath(code):'';
  if(!url) return null;
  // **効果は「今そのキャラクターが見えている位置」から出す。**
  // 攻撃で少し動いた地点で発動した効果が、盤面の定位置から出ると別人のように見える。
  // opt.rect：ひと続きの演出の中で位置を揃えるために、呼び出し側が最初に掴んだ位置。
  // 攻撃モーションが終わってから出し始めると複製カードが既に消えていて、
  // 同じ効果なのにマナ効果の合図だけ動いた位置・固有VFXは元の位置、になっていた。
  const rect=(options&&options.rect&&Number(options.rect.width)>0?options.rect:null)
    ||(typeof _captureUnitEffectRect==='function'
      ?_captureUnitEffectRect(unit,side):_captureUnitDamageRect(unit,side));
  if(!rect||!(rect.width>0)||!(rect.height>0)) return null;
  const opt=options||{};
  const fadeDuration=Math.max(0,Number(opt.fadeDuration)||220);
  const scale=Number(opt.vfxScale)
    ||(typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(code):1);
  let done=false;
  const host=document.createElement('div');
  host.className='effect-sustain-host';
  Object.assign(host.style,{left:`${rect.left}px`,top:`${rect.top}px`,
    width:`${rect.width}px`,height:`${rect.height}px`});
  // **フェードインで出す。** いきなり全開で出すと画面が一瞬白く弾けて見える。
  const fadeInMs=Math.max(0,Number(opt.fadeInMs)!=null&&Number.isFinite(Number(opt.fadeInMs))?Number(opt.fadeInMs):180);
  if(fadeInMs>0){
    host.style.opacity='0';
    host.style.transition=`opacity ${fadeInMs}ms ease-out`;
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ if(!done) host.style.opacity='1'; }); });
  }
  _vfxHostParent().appendChild(host);
  const playing=_playDefinedVfx(host,url,Number(opt.durationMs)||700,
    {repeat:true,size:_definedVfxSize(code,scale),presentationSpeed:true});
  if(typeof actionBannerTrackVfxHost==='function') actionBannerTrackVfxHost(host);
  let resolveComplete;
  const completePromise=new Promise(resolve=>{ resolveComplete=resolve; });
  const activeVfx=window.__activeVfxPromises||(window.__activeVfxPromises=new Set());
  activeVfx.add(completePromise);
  completePromise.finally(()=>activeVfx.delete(completePromise));
  // 盤面の詰め直しでカードは動く。位置を固定すると「何もない場所」に残る。
  // **追いかける先は「今そのキャラクターが見えている位置」**（攻撃モーション中は
  // 動いている複製カード）。盤面の定位置を追いかけていた頃は、
  // 発生位置を渡しても次のフレームで定位置へ戻され、
  // 「活性化だけ元の位置で出る」状態になっていた。
  const follow=()=>{
    if(done) return;
    if(!host.isConnected){ done=true; playing.stop(); resolveComplete(); return; }
    let r=null;
    try{
      r=typeof _captureUnitEffectRect==='function'?_captureUnitEffectRect(unit,side)
        :_captureUnitDamageRect(unit,side);
    }catch(e){ r=null; }
    if(r&&r.width>0&&r.height>0){
      Object.assign(host.style,{left:`${r.left}px`,top:`${r.top}px`,
        width:`${r.width}px`,height:`${r.height}px`});
    }
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
  const startedAt=(typeof performance!=='undefined'?performance.now():Date.now());
  const minDurationMs=Math.max(0,Number(opt.minDurationMs)||0);
  const stop=()=>{
    if(done) return completePromise;
    // 最低再生時間に届いていなければ、そこまで待ってから消す。
    // 待っている間に呼び直されても done は立っていないので二重には走らない。
    const now=(typeof performance!=='undefined'?performance.now():Date.now());
    const remain=minDurationMs-(now-startedAt);
    if(remain>0){ battlePresentationSetTimeout(stop,remain); return completePromise; }
    done=true;
    host.style.transition=`opacity ${fadeDuration}ms ease-out`;
    void host.offsetWidth;
    host.style.opacity='0';
    battlePresentationSetTimeout(()=>{ playing.stop(); try{ host.remove(); }catch(e){} resolveComplete(); },fadeDuration);
    return completePromise;
  };
  const durationMs=Math.max(0,Number(opt.durationMs)||0);
  if(durationMs) battlePresentationSetTimeout(stop,durationMs);
  return { stop, code:String(code||''), done:()=>done };
}

// ── 画面に固定して大きく出す効果VFX（アラクネ）──────────────────
// 対象カードの上ではなく**画面**に出す。アラクネ（C013）は
// 「画面の中心が絵の頂点、画面の底辺が絵の中心」になる大きさで出す
// （＝絵の高さ＝画面の高さ、中心を画面下端へ置く）。
// どの効果をこう出すかは present.js の `PRESENT_SCREEN_BOTTOM_VFX` が唯一の実装。
// ── 状態異常を付けた時のVFX（毒牙の既存素材 等）を「出し直さず継続」させる ──────
// **ここが唯一の描画実装**（PvE・オンライン共通）。同じキャラクターへ続けて
// 付与される間は、既に出ている再生を延ばすだけで作り直さない。
// 尺・フェードの値は present.js（PRESENT_KEYWORD_VFX_*）が唯一の定義。
// 出せた場合だけ true を返す（素材が無ければ false ＝ 呼び出し側が従来の経路へ落とす）。
const _keywordVfxSustain=new Map();
function playKeywordEffectVfxSustained(unit,side,keyword){
  if(!unit||!keyword||typeof playEffectVfxOnUnit!=='function') return false;
  const url=typeof getKeywordEffectVfxPath==='function'?getKeywordEffectVfxPath(keyword):'';
  if(!url) return false;
  const code=typeof getVfxSourceCode==='function'?getVfxSourceCode(url):'';
  if(!code) return false;
  const num=(name,fallback)=>{
    const n=Number(typeof window!=='undefined'?window[name]:undefined);
    return Number.isFinite(n)?n:fallback;
  };
  const holdMs=num('PRESENT_KEYWORD_VFX_HOLD_MS',800);
  const key=`${side}:${unit.id}:${keyword}`;
  const entry=_keywordVfxSustain.get(key);
  const arm=e=>{
    if(e.timer) clearTimeout(e.timer);
    e.timer=setTimeout(()=>{
      _keywordVfxSustain.delete(key);
      if(e.handle&&typeof e.handle.stop==='function') e.handle.stop();
    },holdMs);
  };
  // 既に出ている：**出し直さず、消えるまでの時間を延ばすだけ。**
  if(entry&&entry.handle&&typeof entry.handle.done==='function'&&!entry.handle.done()){
    arm(entry);
    return true;
  }
  // 新しく出す時だけSEを鳴らす（絵と同じ引き方。連続付与で音が途切れ途切れに重ならない）。
  if(typeof playSfx==='function'&&typeof getKeywordEffectSfxKey==='function'){
    const seKey=getKeywordEffectSfxKey(keyword);
    if(seKey) playSfx(seKey,{group:'combat',guardKey:`kwfx:${seKey}:${uid()}`,guardMs:0});
  }
  const handle=playEffectVfxOnUnit(unit,side,code,{
    fadeInMs:num('PRESENT_KEYWORD_VFX_FADE_IN_MS',120),
    fadeDuration:num('PRESENT_KEYWORD_VFX_FADE_OUT_MS',220),
  });
  if(!handle) return false;
  const next={handle,timer:null};
  _keywordVfxSustain.set(key,next);
  arm(next);
  return true;
}
// 戦闘の切れ目で片付ける。残すと次の戦闘の頭で前の絵が出たままになる。
function stopAllKeywordEffectVfx(){
  _keywordVfxSustain.forEach(e=>{
    if(e&&e.timer) clearTimeout(e.timer);
    if(e&&e.handle&&typeof e.handle.stop==='function') e.handle.stop();
  });
  _keywordVfxSustain.clear();
}


// ── 曲線軌道で飛ぶ演出（ミサイル）────────────────────────
// 入れ物の位置と回転だけを動かし、粒・光・帯は定義から共通レンダラーが描く。
// 弧の形・尺・回転の補正は present.js が唯一の実装（ここには数値を書かない）。
//
// playCurvedMissile({ sourceElement | sourceRect, targetElement | targetRect,
//                     asset, scale, impactOffsetY, onHit })
//   ・座標は既存の演出と同じ「画面座標（fixed）」。新しい座標系を作らない。
//   ・始点・終点はDOMの左上ではなく**中央付近**を使う。
//   ・三次ベジェで飛ばし、少し先の点との差から進行方向を出して回転させる。
//   ・onHit は到達した瞬間に1回だけ呼ぶ（ゲームのルールはここで動かさない）。
//   ・終わったら生成したDOMを必ず消す。
// 戻り値は「到達して後始末が済んだ」Promise。
function playCurvedMissile(options){
  _syncEffectFlashWithVfx();
  const opt=options||{};
  const asset=String(opt.asset||'');
  let hit=false;
  const fireHit=async()=>{ if(hit) return; hit=true;
    if(typeof opt.onHit==='function'){ try{ await opt.onHit(); }catch(e){ console.error('[missile onHit]',e); } } };
  const rectOf=(rect,el)=>{
    if(typeof rect==='function'){ try{ return rect(); }catch(e){ return null; } }
    if(rect&&Number(rect.width)>0) return rect;
    if(el&&typeof el.getBoundingClientRect==='function'){
      const r=el.getBoundingClientRect();
      return (r&&r.width>0&&r.height>0)?r:null;
    }
    return null;
  };
  const fromRect=rectOf(opt.sourceRect,opt.sourceElement);
  const toRect=rectOf(opt.targetRect,opt.targetElement);
  if(!asset||!fromRect||!toRect){ return fireHit(); }
  // 始点・終点は**中央付近**。着弾だけは素材の絵が上寄りなぶん少し下げる。
  const impactOffsetY=Number.isFinite(Number(opt.impactOffsetY))?Number(opt.impactOffsetY)
    :((typeof PRESENT_PROJECTILE_IMPACT_OFFSET_Y==='number'&&PRESENT_PROJECTILE_IMPACT_OFFSET_Y)||0);
  const from={x:fromRect.left+fromRect.width/2, y:fromRect.top+fromRect.height/2};
  const codeOffset=typeof presentProjectileImpactOffsetY==='function'
    ?presentProjectileImpactOffsetY(opt.code):impactOffsetY;
  const centerTo={x:toRect.left+toRect.width/2, y:toRect.top+toRect.height/2+toRect.height*codeOffset};
  // 新しい定義の先端は入れ物の中心。画像の透明余白を補う座標補正は不要。
  const to=centerTo;
  // 弧の向き・膨らみ・尺は present.js が決める。毎回完全ランダムにはしない。
  const jitter=_vfxVariantIndex()/VFX_VARIANT_COUNT*2-1;   // -1〜1の決まった並び
  // straight：始点から終点へ**まっすぐ**（弧を描かない）。斜めでも直線になるよう
  // 両軸を等分する。片方の軸だけ動かすと、斜めに飛ばした時に縦線になる。
  const cp=opt.straight
    ?{c1:{x:from.x+(to.x-from.x)/3,y:from.y+(to.y-from.y)/3},
      c2:{x:from.x+(to.x-from.x)*2/3,y:from.y+(to.y-from.y)*2/3},
      dist:Math.hypot(to.x-from.x,to.y-from.y)}
    :(typeof presentMissileControlPoints==='function'
    ?presentMissileControlPoints(from,to,jitter)
    :{c1:from,c2:to,dist:Math.hypot(to.x-from.x,to.y-from.y)});

  const flightMs=Number.isFinite(Number(opt.flightMs))&&Number(opt.flightMs)>0?Number(opt.flightMs)
    :(typeof presentMissileFlightMs==='function'?presentMissileFlightMs(cp.dist):800);
  const ease=typeof presentMissileEase==='function'?presentMissileEase:(t=>t);
  const noseDeg=(typeof PRESENT_MISSILE_NOSE_OFFSET_DEG==='number'?PRESENT_MISSILE_NOSE_OFFSET_DEG:90);
  const bezier=t=>{
    const u=1-t, a=u*u*u, b=3*u*u*t, c=3*u*t*t, d=t*t*t;
    return {x:a*from.x+b*cp.c1.x+c*cp.c2.x+d*to.x,
            y:a*from.y+b*cp.c1.y+c*cp.c2.y+d*to.y};
  };
  const scale=Number(opt.scale)||1;
  // 既存の演出と同じ入れ物を使う（戦闘終了時の一括除去もこのクラスで効く）。
  const host=document.createElement('div');
  host.className='effect-sustain-host';
  Object.assign(host.style,{
    left:`${from.x-fromRect.width/2}px`, top:`${from.y-fromRect.height/2}px`,
    width:`${fromRect.width}px`, height:`${fromRect.height}px`,
    pointerEvents:'none',
  });
  _vfxHostParent().appendChild(host);
  const halfW=fromRect.width/2, halfH=fromRect.height/2;
  if(typeof actionBannerTrackVfxHost==='function') actionBannerTrackVfxHost(host);
  // **縦横比は変えない。** 位置（left/top）と回転・拡大だけを触る。
  const place=(pt,deg)=>{
    host.style.left=`${pt.x-halfW}px`;
    host.style.top=`${pt.y-halfH}px`;
    host.style.transform=`rotate(${deg}deg)`;
  };
  place(from,Number.isFinite(Number(opt.fixedAngle))?Number(opt.fixedAngle)
    :Math.atan2(cp.c1.y-from.y,cp.c1.x-from.x)*180/Math.PI+noseDeg);
  const code=opt.code||(typeof getVfxSourceCode==='function'?getVfxSourceCode(asset):'');
  const playing=_playDefinedVfx(host,asset,flightMs,{size:_definedVfxSize(code,scale),repeat:Number(opt.cleanupDelayMs)>0});
  let cleaned=false;
  const cleanup=()=>{ if(cleaned) return; cleaned=true; playing.stop(); try{ host.remove(); }catch(e){} };
  return new Promise(resolve=>{
    let finished=false;
    const finish=async()=>{
      if(finished) return; finished=true;
      flushWaypoints();
      await fireHit();
      const cleanupDelayMs=Math.max(0,Number(opt.cleanupDelayMs)||0);
      if(cleanupDelayMs) await new Promise(done=>setTimeout(done,cleanupDelayMs));
      cleanup(); resolve();
    };
    // **起点は「実際に最初のフレームが来た時刻」**（攻撃モーションと同じ規則）。
    // 予約時刻を起点にすると、メインスレッドが尺以上止まった時に1フレーム目で着弾する。
    let startedAt=null;
    let lastDeg=Math.atan2(cp.c1.y-from.y,cp.c1.x-from.x)*180/Math.PI;
    // 通過点：飛んでいる絵がその位置を通り過ぎた瞬間に1回だけ呼ぶ。
    // 貫通のように「当たったキャラクターから順に」見せるために使う。
    const waypoints=(Array.isArray(opt.waypoints)?opt.waypoints:[])
      .map(w=>({...w,done:false}))
      .filter(w=>w&&w.point&&typeof w.onReach==='function');
    const fireWaypoints=pt=>{
      waypoints.forEach(w=>{
        if(w.done) return;
        // 進行方向にどれだけ進んだかで判定する（横のずれは見ない）。
        const passed=(pt.x-from.x)*(to.x-from.x)+(pt.y-from.y)*(to.y-from.y)
          >=(w.point.x-from.x)*(to.x-from.x)+(w.point.y-from.y)*(to.y-from.y);
        if(!passed) return;
        w.done=true;
        try{ w.onReach(); }catch(e){ console.error('[missile waypoint]',e); }
      });
    };
    const flushWaypoints=()=>waypoints.forEach(w=>{
      if(w.done) return; w.done=true;
      try{ w.onReach(); }catch(e){ console.error('[missile waypoint]',e); }
    });
    const step=()=>{
      if(cleaned){ resolve(); return; }
      const now=performance.now();
      if(startedAt===null) startedAt=now;
      const raw=Math.min(1,(now-startedAt)/Math.max(1,flightMs));
      const t=ease(raw);
      const pt=bezier(t);
      // 進行方向は「少し先のベジェ点」との差から出す（曲線に沿って先端が向く）。
      // **終端では先が取れない**ので、少し手前との差も使って必ず向きが出るようにする。
      // 片側だけにすると t=1 で差が0になり、最後の1フレームだけ先端が明後日を向く。
      const ahead=bezier(Math.min(1,t+.02));
      const behind=bezier(Math.max(0,t-.02));
      const dx=ahead.x-behind.x, dy=ahead.y-behind.y;
      const deg=Number.isFinite(Number(opt.fixedAngle))?Number(opt.fixedAngle)
        :(Math.hypot(dx,dy)>0.001?Math.atan2(dy,dx)*180/Math.PI:lastDeg)+noseDeg;
      lastDeg=deg-noseDeg;
      place(pt,deg);
      fireWaypoints(pt);
      if(raw>=1){ void finish(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // タブ非表示などでrAFが止まっても必ず着弾させ、DOMも必ず消す。
    setTimeout(()=>{ void finish(); },flightMs+1500);
  });
}

// ── 発生元から対象へ飛ぶ効果VFX（炎の矢）────────────────────
// 上の playCurvedMissile を、既存の「ユニットと陣営」から呼ぶための入口。
// **着弾した瞬間**に着弾VFX・着弾SE・ダメージ数値を出す（`playHitVfx` の effectHitCode 経路）。
// 素材が無ければ何も飛ばさず、着弾側だけを即座に見せる（演出が消えないようにする）。
async function playProjectileEffectVfx(from,fromSide,to,toSide,code,options){
  const opt=options||{};
  // 着弾の効果音はピーク（present.js の実測表）が着弾の瞬間に来るよう、飛行中に先に鳴らし始める（2026-10-15 利用者指摘：ケンタウロスのSEがずれる）。
  let hitSfxStarted=false;
  const startHitSfx=delayMs=>{
    const key=typeof getEffectHitSfxKey==='function'?getEffectHitSfxKey(code):'';
    if(!key) return false;
    hitSfxStarted=true;
    _playSfxAtVfxCue(key,Math.max(0,delayMs||0),{group:'combat',guardKey:`kwfx:${key}:${_vfxVariantIndex()}:${Date.now()}`,guardMs:0});
    return true;
  };
  const impact=async()=>{
    if(typeof opt.onImpact==='function') await opt.onImpact();
    if(!hitSfxStarted) startHitSfx(0);
    if(typeof playHitVfx==='function'){
      const shown=playHitVfx(toSide,to,Math.max(0,Number(opt.amount)||0),{effectHitCode:code,keywordSfx:false});
      if(typeof opt.onDamageShown==='function') opt.onDamageShown();
      await shown;
    }else if(typeof opt.onDamageShown==='function'){
      opt.onDamageShown();
    }
  };
  const url=typeof getEffectVfxPath==='function'?getEffectVfxPath(code):'';
  const rectOf=(u,side)=>typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(u,side):null;
  // **発生源は「今そのキャラクターが見えている位置」**（攻撃で動いた地点）。
  // 着弾側は数値と揃える必要があるので盤面の定位置のまま。
  const fromRect=from
    ?((typeof _captureUnitEffectRect==='function'?_captureUnitEffectRect(from,fromSide):null)||rectOf(from,fromSide))
    :null;
  const toRect=to?rectOf(to,toSide):null;
  if(!url||!fromRect||!toRect){ await impact(); return; }
  const flightMs=Number(opt.flightMs)
    ||(typeof PRESENT_PROJECTILE_FLIGHT_MS_BY_CODE==='object'&&PRESENT_PROJECTILE_FLIGHT_MS_BY_CODE[String(code||'')])
    ||((typeof PRESENT_PROJECTILE_FLIGHT_MS==='number'?PRESENT_PROJECTILE_FLIGHT_MS:420));
  startHitSfx(flightMs);
  await playCurvedMissile({
    asset:url,
    code,
    sourceRect:fromRect,
    targetRect:toRect,
    scale:Number(opt.vfxScale)
      ||(typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(code):1),
    flightMs,
    onHit:impact,
  });
}

// 定義VFXを durationMs（呼び出し側の尺）で再生した時の山場（定義の impact）の実時刻（ms）。
// 演出の速さ（_playDefinedVfx の presentationSpeed）も同じく掛ける。
function _definedVfxCueMs(value,durationMs){
  const name=typeof getVfxDefinitionName==='function'?getVfxDefinitionName(value):'';
  const def=name&&typeof VbFx!=='undefined'?VbFx.effects.find(d=>d.name===name):null;
  if(!def||!(def.ms>0)) return 0;
  const speed=typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1;
  const cue=def.impact&&Number(def.impact.cueMs)||0;
  return cue/def.ms*Math.max(1,Number(durationMs)||def.ms)/Math.max(.01,speed);
}
// 効果音のピーク（present.js の実測表）を cueMs に合わせて鳴らす。前倒しが要る時は音の途中から鳴らす（LABと同じ考え方）。
function _playSfxAtVfxCue(key,cueMs,options){
  if(typeof playSfx!=='function') return;
  const peak=(typeof presentSfxPeakSec==='function'?presentSfxPeakSec(key):0)*1000;
  const lead=(Number(cueMs)||0)-peak, opt=options||{};
  if(lead>=0){
    const run=()=>playSfx(key,opt);
    // lead は既に演出の速さを掛けた実時間（ms）。battlePresentationSetTimeout だと速さを二重に掛けるので素のタイマー。
    if(lead<1) run(); else setTimeout(run,lead);
  } else playSfx(key,{...opt,offsetMs:-lead,fadeInMs:40});
}

function playHitVfxAtRect(rect,amount,options){
  _syncEffectFlashWithVfx();
  if(!rect) return Promise.resolve();
  const opt=options||{};
  // マナ・負傷効果が短時間に大量発動する場面向けの演出高速化倍率（既定1＝通常速度）。
  // _stepEffectPace()（battle.js）が発動のたびに更新する。
  const speedMul=(typeof G!=='undefined'&&G&&Number(G._effectVfxSpeedMultiplier))||1;
  // 撃破後の盤面詰めがVFX完了を待つようになったため、既定尺のままだと1体倒すごとに
  // 待ち時間が上乗せされてテンポが悪化する。表示・消失とも少し早める。
  let hitDuration=(opt.hitDuration||800)/speedMul;
  const fadeDuration=(opt.fadeDuration||140)/speedMul;
  const labelDuration=damageLabelDurationMs(opt.labelDuration,opt.labelDurationMin);
  // 見た目の再生時間（hitDuration）と、次の行動に進むまで呼び出し元が待つ時間は切り離す。
  // hitDurationはあくまで演出を見やすくスローにするためのもので、これに比例して攻撃間の
  // テンポまで間延びしないよう、呼び出し元への復帰は短いgateMsだけ待てば十分とする。
  // 演出自体はgateMs経過後もバックグラウンドで最後まで再生・フェードアウトを続ける。
  const gateMs=(opt.gateMs??200)/speedMul;
  if(!rect.width||!rect.height) return Promise.resolve();
  // 着弾VFX（enchantEffectHit）は、素材の絵が下寄りなので少し上へずらして出す。
  // ずらすのは**VFXの入れ物だけ**。数値のラベルは対象カードの上に残す。
  // **値を決めるのは effectHitVfx が決まった後**（宣言前に読むと参照エラーで演出が止まる）。
  let hostOffsetY=0;
  const host=document.createElement('div');
  host.className='damage-vfx-host';
  Object.assign(host.style,{
    left:`${rect.left}px`,
    top:`${rect.top}px`,
    width:`${rect.width}px`,
    height:`${rect.height}px`,
  });
  // キャラクターの効果でダメージが発生した場合、そのキャラクター専用のVFXがあればそれを再生する。
  // 無ければ通常のhit定義を使う。
  const charVfx=opt.effectSource&&typeof getCharacterEffectVfxPath==='function'?getCharacterEffectVfxPath(opt.effectSource):'';
  // キャラクター固有VFXが無い場合、毒等キーワード発動によるダメージならキーワード専用のVFXを探す。
  const keywordVfx=!charVfx&&opt.keywordEffect&&typeof getKeywordEffectVfxPath==='function'?getKeywordEffectVfxPath(opt.keywordEffect):'';
  // 状態異常を付けたダメージの絵（弱体の既存素材）。**絵だけ差し替え、SEは変えない。**
  const vfxKeywordUrl=!charVfx&&!keywordVfx&&opt.vfxKeyword&&typeof getKeywordEffectVfxPath==='function'
    ?getKeywordEffectVfxPath(opt.vfxKeyword):'';
  // 効果が**対象に当たった瞬間**の専用演出（炎の矢＝E058_2）。
  // 発生元に出す演出（enchantEffect）とは別素材で、こちらが最優先。
  const effectHitVfx=opt.effectHitCode&&typeof getEffectHitVfxPath==='function'
    ?getEffectHitVfxPath(opt.effectHitCode):'';
  if(effectHitVfx){
    hostOffsetY=rect.height*((typeof PRESENT_EFFECT_HIT_OFFSET_Y==='number'?PRESENT_EFFECT_HIT_OFFSET_Y:0));
    host.style.top=`${rect.top+hostOffsetY}px`;
  }
  // 絵と同じ引き方でSEも鳴らす。**片方だけ番号がずれると音と絵が食い違う。**
  // opt.keywordSfx===false の呼び出し（マナ効果の合図など）は、SEを別で鳴らすので抑える。
  if(typeof playSfx==='function'&&opt.keywordSfx!==false){
    const hitKey=effectHitVfx&&typeof getEffectHitSfxKey==='function'?getEffectHitSfxKey(opt.effectHitCode):'';
    const kwKey=!hitKey&&opt.keywordEffect&&typeof getKeywordEffectSfxKey==='function'
      ?getKeywordEffectSfxKey(opt.keywordEffect):'';
    const seKey=hitKey||kwKey;
    if(seKey) playSfx(seKey,{group:'combat',guardKey:`kwfx:${seKey}:${_vfxVariantIndex()}:${Date.now()}`,guardMs:0});
  }
  // labelOnly：命中VFXを出さず、ダメージ数値だけを出す。
  // 薙ぎ払い（アラッサス）のように演出を別で持つ効果で、数値まで消さないために使う。
  const labelOnly=!!opt.labelOnly;
  const customVfx=opt.customVfxPath||'';
  const hitUrl=customVfx||effectHitVfx||charVfx||keywordVfx||vfxKeywordUrl||Assets?.vfx?.hit||'vfx:hit:hit-burst';
  // キャラクター固有VFXの大きさは present.js が唯一の実装。
  // 明示指定が無いときは素材の番号から決める（指定しないと等倍で巨大に出る）。
  // 大きさの鍵は**枝番まで含めた素材名**（E058_1 と E058_2 は別物）。
  // 枝番を落とすと、着弾VFXが矢と同じ倍率で描かれて見えなくなる（実際にそうなった）。
  // **キーワードVFX（毒の既存素材・毒牙の既存素材 等）も同じ倍率表で決める。**
  // ここに入れていなかった頃は、素材の大きさをどう登録しても等倍のままだった。
  const scaleSourceUrl=customVfx||effectHitVfx||charVfx||keywordVfx||vfxKeywordUrl||'';
  const charVfxCode=scaleSourceUrl
    ?(typeof getVfxSourceCode==='function'?getVfxSourceCode(scaleSourceUrl):''):'';
  const vfxScale=Number(opt.vfxScale)
    ||(charVfxCode&&typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(charVfxCode):1);
  // 被弾位置に出す固有VFX（肩代わり＝マータ等）の尺は present.js の表（2026-10-15 利用者指定：マータは2.5倍を標準）。
  const ownHitVfx=!!(charVfx&&!customVfx&&!effectHitVfx&&!labelOnly);
  if(ownHitVfx&&!opt.hitDuration&&typeof presentCharacterHitVfxMs==='function'){
    const own=presentCharacterHitVfxMs(charVfxCode);
    if(own) hitDuration=own/speedMul;
  }
  const spin=!!opt.spin;
  const rotation=Number(opt.rotation)||0;
  const baseTransform=`rotate(${rotation}deg)`;
  _vfxHostParent().appendChild(host);
  let labelHost=null;
  if(typeof actionBannerTrackVfxHost==='function'&&!labelOnly) actionBannerTrackVfxHost(host);

  // 数値は独立したホストへ出す。絵の追従・回転・不透明度だけを共通描画へ渡す。
  const mediaEl=host;
  mediaEl.style.transform=baseTransform;
  const playing=labelOnly?{stop:()=>{}}:_playDefinedVfx(host,hitUrl,hitDuration,
    {size:_definedVfxSize(charVfxCode,vfxScale),presentationSpeed:true});
  // 2026-10-15：被弾位置の固有VFXは、固有SEをVFXと同時に鳴らし、SEのピークをVFXの山場（定義のimpact）へ合わせる。
  // 以前はPvEだけ1手番の演出の後でまとめて鳴らしていた（オンラインは鳴っていなかった）。PvE・オンライン共通の入口。
  if(ownHitVfx&&opt.effectSfx&&charVfxCode&&typeof getEffectSfxKey==='function'
    &&!(typeof presentLabFx==='function'&&presentLabFx(charVfxCode))){
    const sfxKey=getEffectSfxKey(charVfxCode);
    if(sfxKey) _playSfxAtVfxCue(sfxKey,_definedVfxCueMs(hitUrl,hitDuration),{group:'magic',guardKey:`effect:${sfxKey}:${uid()}`,guardMs:0});
  }
  const stop=playing.stop;
  if(amount>0){
    const label=document.createElement('div');
    label.className='vfx-damage-label';
    label.textContent=`-${amount}`;
    // 数値の上に出す小さな見出し（ATKへのダメージ＝武器破壊の「ATK」）。
    // 何に入ったダメージなのかを、被弾VFXの代わりにここで示す。
    if(opt.labelNote){
      const note=document.createElement('span');
      note.className='vfx-damage-note';
      note.textContent=String(opt.labelNote);
      label.appendChild(note);
    }
    label.style.setProperty('--damage-label-duration',`${labelDuration}ms`);
    // 数値はVFXホストのスタッキングコンテキストから分離し、常に全VFXより前面へ出す。
    labelHost=document.createElement('div');
    labelHost.className='damage-label-host';
    // 同じ位置に前の数値が残っていると重なって読めない。連続表示では
    // 前の数値を消してから次を出す（同じ対象の古いラベルだけを消す）。
    const labelKey=opt.labelKey||`${Math.round(rect.left)}:${Math.round(rect.top)}`;
    labelHost.dataset.damageLabelKey=String(labelKey);
    // 前の数値は**即座に消さず、素早く薄れさせる**。即消しにすると、同じ値が
    // 続く時（闇の炎が4回発動など）に数値が出っぱなしに見えて回数が分からない。
    // 「出て、消えそうになる」を回数分見せる。2回目の重なりが来たものは即座に外す。
    // 前の数値は即座に外す。残したまま次を重ねると、同じ位置に同じ「-1」が
    // 出続けて「1回しか出ていない」ように見える。
    // 回数を見せるのは**次の数値までの間に1回分の「出て消える」を収めること**で行う
    // （labelDuration に連続再生の間隔を渡す。呼び出し側は present_events.js）。
    document.querySelectorAll(`.damage-label-host[data-damage-label-key="${String(labelKey).replace(/"/g,'\\"')}"]`)
      .forEach(old=>old.remove());
    Object.assign(labelHost.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    // VFXと同じクリップ層へ入れる。層内では数値（10030）が各VFXホストより前面に出る。
    // クリップ層は画面全体のposition:fixedなので、上の画面座標はそのまま使える。
    _vfxHostParent().appendChild(labelHost);
    labelHost.appendChild(label);
    // 数値のアニメーションが終わったら入れ物ごと外す。**透明のまま置いておかない。**
    // VFX本体（hitDuration）より数値の方が短いことがあり、残しておくと
    // 見えていない数値がDOM上に居座る。盤面が詰まると、その位置が
    // 「カードの無い場所」になり、位置の検査にも実際の見た目にも出てくる。
    label.addEventListener('animationend',()=>{ try{ labelHost.remove(); }catch(e){} },{once:true});
    const damageDigits=String(Math.max(0,Math.floor(Math.abs(Number(amount)||0)))).length;
    if(damageDigits>=3){
      // 3桁から少しずつ縮小し、桁数が増え続けてもカード幅からはみ出さないようにする。
      // damage-label-animationの最大scaleが1.3なので、通常幅をカード幅以下に収めれば
      // アニメーション中もキャラクター画像幅の1.3倍を超えない。
      const baseFontSize=parseFloat(getComputedStyle(label).fontSize)||60;
      const digitScale=Math.pow(.9,damageDigits-2);
      label.style.fontSize=`${baseFontSize*digitScale}px`;
      const labelWidth=label.scrollWidth;
      if(labelWidth>rect.width&&labelWidth>0){
        label.style.fontSize=`${baseFontSize*digitScale*(rect.width/labelWidth)}px`;
      }
    }
  }
  // 演出本体の後始末（フェードアウト→DOM除去）はgateMsとは無関係に、演出の実時間に沿って
  // バックグラウンドで進行させる。呼び出し元（戦闘ループ）はこれを待たない。
  let done=false;
  let fadeStarted=false;
  // 盤面の詰め直し（FLIP）でカードは演出中にも動く。位置を出した時のまま固定すると、
  // 数値やVFXが「何もない場所」に取り残される。対象カードの現在位置へ毎フレーム追従させる。
  if(typeof opt.getRect==='function'){
    let hadRect=false,missed=0;
    const follow=()=>{
      if(done) return;
      let r=null;
      try{ r=opt.getRect(); }catch(e){ r=null; }
      if(r&&r.width>0&&r.height>0){
        hadRect=true; missed=0;
        const box={left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`};
        Object.assign(host.style,{...box,top:`${r.top+r.height*(hostOffsetY?hostOffsetY/rect.height:0)}px`});
        if(labelHost) Object.assign(labelHost.style,box);
      } else if(hadRect&&++missed>2){
        // 対象カードが盤面から消えた。数値だけが空白の上に残ると
        // 「何もない場所に数値が出ている」ように見えるため、ここで畳む。
        finish();
        return;
      }
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }
  const notifyFadeStart=()=>{
    if(fadeStarted) return;
    fadeStarted=true;
    if(typeof opt.onFadeStart==='function'){
      try{ opt.onFadeStart(); }catch(e){ console.error('[HitVfx onFadeStart]',e); }
    }
  };
  let resolveComplete;
  const completePromise=new Promise(resolve=>{ resolveComplete=resolve; });
  const activeVfx=window.__activeVfxPromises||(window.__activeVfxPromises=new Set());
  activeVfx.add(completePromise);
  completePromise.finally(()=>activeVfx.delete(completePromise));
  const finish=()=>{
    if(done) return; done=true;
    notifyFadeStart();
    mediaEl.style.transition=`opacity ${fadeDuration}ms ease-out`;
    // transitionプロパティを設定した直後に同じフレーム内でopacityを変更すると、ブラウザによっては
    // トランジションが認識されずopacity:0へ瞬時にジャンプしてしまう（消え方が不自然に見える原因）。
    // 一度スタイルを強制的に確定させてから変更することで、確実にフェードアニメーションとして扱わせる。
    void mediaEl.offsetWidth;
    mediaEl.style.opacity='0';
    battlePresentationSetTimeout(()=>{ stop(); host.remove(); labelHost?.remove(); resolveComplete(); },fadeDuration);
  };
  // 尺と終盤のフェード、onFadeStartの時刻は旧入口と同じ。
  const fadeStartRatio=Math.max(0,Math.min(1,1-fadeDuration/hitDuration));
  const finishPlayback=()=>{ if(done) return; done=true; notifyFadeStart(); stop(); host.remove(); labelHost?.remove(); resolveComplete(); };
  if(typeof mediaEl.animate==='function'){
    const anim=mediaEl.animate([
      {opacity:1,offset:0}, {opacity:1,offset:fadeStartRatio}, {opacity:0,offset:1},
    ],{duration:hitDuration,easing:'ease-out',fill:'forwards'});
    anim.addEventListener('finish',finishPlayback,{once:true});
  }
  if(spin&&typeof mediaEl.animate==='function') mediaEl.animate([
    {transform:`${baseTransform} rotate(0deg)`},
    {transform:`${baseTransform} rotate(360deg)`},
    {transform:`${baseTransform} rotate(1440deg)`},
  ],{duration:hitDuration,easing:'linear',fill:'forwards'});
  battlePresentationSetTimeout(finishPlayback,hitDuration+60);
  battlePresentationSetTimeout(notifyFadeStart,Math.max(0,hitDuration-fadeDuration));
  // 呼び出し元が待つのはgateMsだけ（waitForFinishの場合は従来どおり最後まで）。
  return opt.waitForFinish?completePromise:new Promise(resolve=>battlePresentationSetTimeout(resolve,gateMs));
}

function playHitVfxOnSlot(slot,amount,options){
  if(!slot) return Promise.resolve();
  const rect=slot.getBoundingClientRect();
  return playHitVfxAtRect(rect,amount,options);
}

// ATKが0になったキャラクターの逃走表示。
// **開戦時の登場と同じ形式**（同じVFX・同じSE・同じ緩急）で、逆向きに退場させる。
// 部品は開戦側（battle.js の _battleOpeningLandingVfx）をそのまま呼ぶ。作り直さない。
// 死亡演出は使わない（逃走は死亡ではない）。
// 待ちの理由：**ATKへ入った数値を読ませてから退場を始める。**
// すぐ動かすと、数値が出た直後にカードが消えて何が起きたのか分からない。
const PRESENT_FLED_DELAY_MS=380;   // 数値を読ませる間
const PRESENT_FLED_HOLD_MS=120;    // ふくらんでから動き出すまで
const PRESENT_FLED_MOVE_MS=420;    // 移動（開戦の登場と同じ緩急・同じ長さ）
const PRESENT_FLED_FADE_MS=200;    // 動き出したらすぐ消える
const PRESENT_FLED_MOVE_X=-280;    // 画面座標（3840x2160）での移動量。
                                   // 開戦の登場で実際に見えている距離と同じくらい。
                                   // vw は画面の拡縮と連動しないので使わない。
const PRESENT_FLED_EASING='cubic-bezier(.2,.8,.25,1)';
const PRESENT_FLED_LETTER_MS=90;   // 「FLED」を1文字ずつ落とす間隔
const PRESENT_FLED_LABEL_MS=620;   // 文字が落ち切ってから消すまで
function _removeUnitDamageLabel(unit){
  if(!unit||unit.id==null||typeof document==='undefined') return;
  const key=`u:${unit.id}`;
  document.querySelectorAll('.damage-label-host[data-damage-label-key]').forEach(host=>{
    if(String(host.dataset.damageLabelKey||'')===key) host.remove();
  });
}
async function playFledVfx(side, unit){
  const slot=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,unit):null;
  if(!slot) return;
  // 退場でカードが動く前の位置。「FLED」はここへ出す。
  const rect=slot.getBoundingClientRect();
  // 退場中に盤面を詰め直されるとカードのDOMごと作り直され、動きが飛ぶ。
  // 攻撃モーションと同じ仕組みで、終わるまで詰め・描き直しを保留する。
  const hold=typeof beginBattleMotion==='function';
  if(hold) beginBattleMotion();
  try{
    await new Promise(r=>setTimeout(r,PRESENT_FLED_DELAY_MS));
    if(typeof _battleOpeningLandingVfx==='function'){
      try{ _battleOpeningLandingVfx(slot); }catch(e){ console.error('[fled vfx]',e); }
    }
    slot.classList.add('battle-opening-card');
    slot.style.setProperty('z-index','80','important');
    slot.style.setProperty('transition','none','important');
    slot.style.setProperty('transform','translateX(0) scale(1)','important');
    slot.style.setProperty('opacity','1','important');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    slot.style.setProperty('transition',
      `transform ${PRESENT_FLED_MOVE_MS}ms ${PRESENT_FLED_EASING}, opacity ${PRESENT_FLED_FADE_MS}ms ease-out`,'important');
    slot.style.setProperty('transform','translateX(0) scale(1.12)','important');
    await new Promise(r=>setTimeout(r,PRESENT_FLED_HOLD_MS));
    // ダメージ数値は盤面の定位置で読ませるもの。カードが逃走の移動を始める時点で閉じ、
    // 退場後に _lastVisualRect の旧位置へ数値だけが残らないようにする。
    // ここまでに DELAY + HOLD の読み取り時間は確保されている。
    _removeUnitDamageLabel(unit);
    slot.style.setProperty('transform',`translateX(${PRESENT_FLED_MOVE_X}px) scale(.96)`,'important');
    slot.style.setProperty('opacity','0','important');
    // **カードが消えるのと同時に「FLED」を出す。**
    // カードの子にすると一緒に透明になるので、数値と同じく body 直下の入れ物へ出す。
    // 盤面から独立しているので、カードを外した後もそのまま残る。
    // **ここで文字の表示を待たないこと。** 待つと、その間カードが盤面に残り、
    // 呼び出し側が外すまで一度戻ってきたように見える。消すのは時間で予約する。
    const label=_spawnFledLabel(rect);
    if(label) window.setTimeout(()=>{ try{ label.remove(); }catch(e){} },
      PRESENT_FLED_LETTER_MS*4+PRESENT_FLED_LABEL_MS);
    // 消え切るまで。移動の終わりまでは待たない（既に見えていない）。
    await new Promise(r=>setTimeout(r,PRESENT_FLED_FADE_MS+60));
    // **透明のままにしておく。** ここで元へ戻すと、呼び出し側が盤面から外すまでの間
    // カードがまた現れる。スロットのDOMは次の描き直しで作り直される。
  } finally {
    if(hold&&typeof endBattleMotion==='function') endBattleMotion();
  }
}
// 「FLED」の文字。カードが居た場所へ、1文字ずつ落として出す。
// 文字の大きさはカード幅から決めるので、どの拡大率でも枠と釣り合う。
function _spawnFledLabel(rect,text){
  if(!rect||!(rect.width>0)) return null;
  const word=String(text||'FLED');
  const host=document.createElement('div');
  host.className='fled-label-host';
  Object.assign(host.style,{left:`${rect.left}px`,top:`${rect.top}px`,
    width:`${rect.width}px`,height:`${rect.height}px`});
  const label=document.createElement('div');
  label.className='fled-label';
  // 文字数が増えても枠からはみ出さないよう、4文字を基準に縮める。
  label.style.fontSize=`${Math.max(12,Math.round(rect.width*0.30*Math.min(1,4/word.length)))}px`;
  word.split('').forEach((ch,i)=>{
    const span=document.createElement('span');
    span.textContent=ch;
    span.style.animationDelay=`${i*PRESENT_FLED_LETTER_MS}ms`;
    label.appendChild(span);
  });
  host.appendChild(label);
  // **ダメージ数値と同じ層（#vfx-frame-clip の中・z-index:10030）へ置く。**
  // body 直下（z-index:330）に置いていた頃は、同じ層の中で消えていくカードの複製
  // （衰弱・毒で死んだ時の波打ち .death-wave-clone：10019）の下に隠れ、WASTED が一度も見えなかった。
  (typeof _vfxHostParent==='function'?_vfxHostParent():document.body).appendChild(host);
  return host;
}
// ── 「WASTED」の文字（ダメージ以外でHPが0になった時）────────────
// 見せ方は「FLED」と同じ（カードが居た場所へ1文字ずつ落とす）。
// 呼ぶのは青い波打ちの死亡演出と同じ場面だけ。
function playWastedLabel(rect){
  if(!rect||!(rect.width>0)) return null;
  const host=_spawnFledLabel(rect,'WASTED');
  if(host){
    host.classList.add('wasted-label-host');
    window.setTimeout(()=>{ try{ host.remove(); }catch(e){} },
      PRESENT_FLED_LETTER_MS*6+PRESENT_FLED_LABEL_MS);
  }
  return host;
}
if(typeof window!=='undefined'){ window.playFledVfx=playFledVfx; window.playWastedLabel=playWastedLabel; }

// ── 薙ぎ払いの見せ方（PvEとオンラインで唯一の実装）──────────────
// 対象ごとの命中VFXを出す代わりに、攻撃者から炎が薙ぎ払い、当たった瞬間に
// その対象のダメージ数値を出す。片側だけ別実装にすると、オンラインだけ
// 対象ごとに固有VFXが3回出る、といった食い違いになる。
//   damageOf(target) … その対象のダメージイベント（{amount, keywordEffect}）を返す
//   onShown(target, ev) … 数値を出した対象を呼び出し側へ知らせる（二重表示の抑止用）
// ── 復活（キーワード「復活」で再召喚された）時の演出（既存素材）──────────
// **SEと同時にVFXをフェードイン → その上にカードをフェードイン → VFXをフェードアウト。**
// 大きさ・尺・命中はLABで承認されたrevive-summonの定義を使う。
async function playReviveVfx(unit,side){
  _syncEffectFlashWithVfx();
  if(!unit||typeof playBattleLabFx!=='function') return false;
  const reveal=()=>{
    delete unit._reviveHidden;
    document.querySelectorAll('.slot[data-unit-id]').forEach(el=>{
      if(el.dataset.unitId===String(unit.id)) el.classList.remove('revive-hidden');
    });
  };
  try{ await playBattleLabFx(getKeywordAssetKey('復活'),unit,[unit],{side,onImpact:reveal}); return true; }
  finally{ reveal(); }
}

// ── マナを得た時の演出（S004）────────────────────────────
// **発生させたキャラクターの上**に、魔導板の方向アイコンと同じ大きさで出す。
// 大きさ・尺は present.js（PRESENT_MANA_GAIN_VFX_*）が唯一の定義。
// 素材が登録されていなければ何もしない（SEだけが鳴る）。
function playManaGainVfx(unit,side,options){
  _syncEffectFlashWithVfx();
  if(!unit||typeof document==='undefined') return false;
  const url=typeof getEffectVfxPath==='function'?getEffectVfxPath('S004'):'';
  if(!url) return false;
  const rect=options&&options.rect|| (typeof _captureUnitEffectRect==='function'?_captureUnitEffectRect(unit,side)
    :(typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(unit,side):null));
  if(!rect||!(rect.width>0)) return false;
  const num=(name,fallback)=>{
    const n=Number(typeof window!=='undefined'?window[name]:undefined);
    return Number.isFinite(n)?n:fallback;
  };
  const scale=typeof _gameScale==='function'?(Number(_gameScale())||1):1;
  // 大きさは「方向アイコンと同じ64px（ゲーム内座標）」。ただし戦闘のカードは大きいので、
  // カード幅に対する下限を下回らないようにする（点にしか見えないのを防ぐ）。
  const size=Math.max(8, num('PRESENT_MANA_GAIN_VFX_SIZE',64)*scale,
    rect.width*num('PRESENT_MANA_GAIN_VFX_MIN_CARD_RATIO',.55));
  const fadeIn=num('PRESENT_MANA_GAIN_VFX_FADE_IN_MS',140);
  const hold=num('PRESENT_MANA_GAIN_VFX_HOLD_MS',260);
  const fadeOut=num('PRESENT_MANA_GAIN_VFX_FADE_OUT_MS',260);
  // 出し始めの位置と、消えるまでに上へ動く距離。どちらも**カード高さに対する比**（present.js）。
  const startY=num('PRESENT_MANA_GAIN_VFX_START_Y',.18);
  const rise=num('PRESENT_MANA_GAIN_VFX_RISE',.35);
  const riseMs=fadeIn+hold+fadeOut;
  const host=document.createElement('div');
  host.className='effect-sustain-host';
  Object.assign(host.style,{
    left:`${rect.left+rect.width/2-size/2}px`,
    // **カードの中央より少し上**から出す（以前はカードの上端よりさらに上だった）。
    top:`${rect.top+rect.height/2-size/2-rect.height*startY}px`,
    width:`${size}px`,height:`${size}px`,pointerEvents:'none',opacity:'0',
    transform:'translateY(0)',
    transition:`opacity ${fadeIn}ms ease-out, transform ${riseMs}ms linear`,
  });
  _vfxHostParent().appendChild(host);
  const playing=_playDefinedVfx(host,url,riseMs+80);
  // 2026-10-12: 新しい固有演出の後続を共通presenterが待てるよう完了だけを通知。
  // 既存呼び出しの大きさ・動き・尺・戻り値は保持する。
  if(options&&typeof options.onDone==='function')Promise.resolve(playing.promise).then(options.onDone,options.onDone);
  if(typeof actionBannerTrackVfxHost==='function') actionBannerTrackVfxHost(host);
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
    host.style.opacity='1';
    // 出た瞬間から消え終わるまで、一定の速さで上へ動かす。
    host.style.transform=`translateY(${-rect.height*rise}px)`;
  }); });
  setTimeout(()=>{
    // transform は同じ値のままなので、ここで指定を書き直しても上への移動は途切れない。
    host.style.transition=`opacity ${fadeOut}ms ease-out, transform ${riseMs}ms linear`;
    host.style.opacity='0';
    setTimeout(()=>{ playing.stop(); try{ host.remove(); }catch(e){} },fadeOut+80);
  },fadeIn+hold);
  return true;
}

// ── 発生源から広がる範囲効果（薙ぎ払い／広がる波）─────────────────
// **ここが唯一の実装**（PvE・オンライン共通）。どの絵で見せるかは present.js の
// `presentAreaVfxStyle()` が決める。**見た目上当たった相手から数値を出す。**
// opt.sideOf(target)：その対象がどちらの陣営か（サイレンは味方にも当たる）。
async function presentSweepAttack(source,isEnemySide,targets,damageOf,onShown,opt){
  if(!source||!targets||!targets.length) return false;
  const defaultSide=isEnemySide?'ally':'enemy';
  const sideOf=target=>((opt&&typeof opt.sideOf==='function'&&opt.sideOf(target))||defaultSide);
  const showHit=target=>{
    if(!target) return;
    const ev=typeof damageOf==='function'?damageOf(target):null;
    const amount=Math.max(0,Number(ev&&ev.amount)||0);
    if(!(amount>0)) return;
    const side=sideOf(target);
    if(typeof onShown==='function') onShown(target,ev);
    if(typeof updateUnitDamageUi==='function') updateUnitDamageUi(target,side);
    // 2026-10-11: 範囲攻撃も絵が当たって数値を出す瞬間に、共通の振動入口へ渡す。
    if(typeof presentDamageImpact==='function') presentDamageImpact(ev);
    // 命中VFXと数値の両方を、絵が当たった瞬間に出す。
    if(typeof playHitVfx==='function') playHitVfx(side,target,amount,
      {...(ev&&ev.keywordEffect?{keywordEffect:ev.keywordEffect}:{})});
  };
  const code=typeof _effectPresentationCode==='function'?_effectPresentationCode(source):'';
  // アラッサス等の薙ぎ払いは通常の単体ダメージ経路を通らないため、
  // 固有SEも共通の薙ぎ払い経路で一度だけ鳴らす。
  const sweepSfx=typeof getEffectSfxKey==='function'?getEffectSfxKey(code):'';
  if(sweepSfx&&typeof playSfx==='function'){
    playSfx(sweepSfx,{group:'magic',guardKey:`sweep:${code}:${source&&source.id||''}`,guardMs:0});
  }
  const style=typeof presentAreaVfxStyle==='function'?presentAreaVfxStyle(code):'sweep';
  if(style==='expand'){
    return await playExpandingWaveVfx(source,isEnemySide?'enemy':'ally',targets,code,{onTargetHit:showHit});
  }
  const url=typeof getCharacterSweepVfxPath==='function'?getCharacterSweepVfxPath(source):'';
  if(!url||typeof playCharacterSweepVfx!=='function') return false;
  await playCharacterSweepVfx(source,isEnemySide,targets,url,{onTargetHit:showHit});
  return true;
}

// 発生源の周りにフェードインしてから高速で巨大化し、画面外へ抜ける波（サイレン＝C016）。
// **広がった絵が届いた対象から順に数値を出す**（薙ぎ払いと同じ規則）。
// 素材が登録されていなければ何もしない（通常の被弾演出に任せる）。
async function playExpandingWaveVfx(source,sourceSide,targets,code,options){
  _syncEffectFlashWithVfx();
  const opt=options||{};
  const url=typeof getCharacterEffectVfxPath==='function'
    ?getCharacterEffectVfxPath({fxCode:code}):'';
  const rect=typeof _captureUnitEffectRect==='function'?_captureUnitEffectRect(source,sourceSide)
    :(typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(source,sourceSide):null);
  if(!url||!rect||!(rect.width>0)) return false;
  const sfxKey=typeof getEffectSfxKey==='function'?getEffectSfxKey(code):'';
  if(sfxKey&&typeof playSfx==='function'){
    playSfx(sfxKey,{group:'magic',guardKey:`area-vfx:${sfxKey}:${Date.now()}`,guardMs:0});
  }
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
  const vw=window.innerWidth||1920, vh=window.innerHeight||1080;
  const diag=Math.hypot(vw,vh);
  const startW=rect.width*((typeof PRESENT_EXPAND_VFX_START==='number'&&PRESENT_EXPAND_VFX_START)||.6);
  const endW=diag*((typeof PRESENT_EXPAND_VFX_END==='number'&&PRESENT_EXPAND_VFX_END)||2.4);
  const fadeMs=(typeof PRESENT_EXPAND_VFX_FADE_MS==='number'&&PRESENT_EXPAND_VFX_FADE_MS)||180;
  const growMs=(typeof PRESENT_EXPAND_VFX_GROW_MS==='number'&&PRESENT_EXPAND_VFX_GROW_MS)||620;
  // 対象までの距離。**近い順に当たる**ので、届いた瞬間に数値を出す。
  const pending=(targets||[]).map(unit=>{
    const side=(G.enemies||[]).includes(unit)?'enemy':'ally';
    const r=typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(unit,side):null;
    const dist=r?Math.hypot(r.left+r.width/2-cx,r.top+r.height/2-cy):0;
    return {unit,dist,done:false};
  }).sort((a,b)=>a.dist-b.dist);
  const host=document.createElement('div');
  host.className='effect-sustain-host';
  Object.assign(host.style,{left:`${cx-startW/2}px`,top:`${cy-startW/2}px`,
    width:`${startW}px`,height:`${startW}px`,pointerEvents:'none',opacity:'0',zIndex:'10022'});
  _vfxHostParent().appendChild(host);
  const playing=_playDefinedVfx(host,url,fadeMs+growMs);
  let cleaned=false;
  const cleanup=()=>{ if(cleaned) return; cleaned=true; playing.stop(); try{ host.remove(); }catch(e){} };
  const fireReached=radius=>pending.forEach(p=>{
    if(p.done||radius<p.dist) return;
    p.done=true;
    if(typeof opt.onTargetHit==='function') opt.onTargetHit(p.unit);
  });
  const flushAll=()=>pending.forEach(p=>{
    if(p.done) return;
    p.done=true;
    if(typeof opt.onTargetHit==='function') opt.onTargetHit(p.unit);
  });
  if(typeof actionBannerTrackVfxHost==='function') actionBannerTrackVfxHost(host);
  await new Promise(resolve=>{
    let startedAt=null;
    const total=fadeMs+growMs;
    const finish=()=>{ flushAll(); cleanup(); resolve(); };
    const step=()=>{
      if(cleaned){ resolve(); return; }
      const now=performance.now();
      if(startedAt===null) startedAt=now;
      const t=now-startedAt;
      if(t<fadeMs){
        host.style.opacity=String(Math.max(0,Math.min(1,t/fadeMs)));
        requestAnimationFrame(step);
        return;
      }
      host.style.opacity='1';
      // 巨大化は最初が速い（ease-out）。
      const p=Math.max(0,Math.min(1,(t-fadeMs)/growMs));
      const eased=1-Math.pow(1-p,2);
      const w=startW+(endW-startW)*eased;
      host.style.left=`${cx-w/2}px`;
      host.style.top=`${cy-w/2}px`;
      host.style.width=`${w}px`;
      host.style.height=`${w}px`;
      // 絵には透明の余白があるので、届いたとみなす半径は少し内側にする。
      fireReached(w/2*((typeof PRESENT_EXPAND_VFX_HIT_RATIO==='number'&&PRESENT_EXPAND_VFX_HIT_RATIO)||.8));
      if(p>=1){ finish(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // rAFが止まる環境でも必ず終わらせ、DOMも必ず消す。
    battlePresentationSetTimeout(finish,total+1200);
  });
  return true;
}

function playHitVfx(side,idxOrUnit,amount,options){
  // 同じキャラクターへ続けて数値が出る時、前の数値を消してから次を出せるよう
  // 対象を識別する鍵を渡す（渡さないと座標で判定するため、盤面が動くと重なる）。
  const unitId=idxOrUnit&&typeof idxOrUnit==='object'?idxOrUnit.id:idxOrUnit;
  const liveRect=()=>{
    const s=getCurrentUnitSlot(side,idxOrUnit);
    if(s&&!(s.classList&&s.classList.contains('dead-empty'))){
      const r=s.getBoundingClientRect();
      if(r&&r.width>0&&r.height>0) return r;
    }
    return (idxOrUnit&&typeof idxOrUnit==='object'?idxOrUnit._lastVisualRect:null)||null;
  };
  const opt={...(options||{}),getRect:(options&&options.getRect)||liveRect,
    ...(unitId!=null?{labelKey:`u:${unitId}`}:{})};
  const slot=getCurrentUnitSlot(side,idxOrUnit);
  // 空きスロット（死亡後の枠）は7枠等間隔の位置にあり、生存時の中央寄せとは別物。
  // そこへ数値を出すと「何もない場所」に見えるので、直前のカード位置を使う。
  const dead=!slot||(slot.classList&&slot.classList.contains('dead-empty'));
  if(dead){
    const last=idxOrUnit&&typeof idxOrUnit==='object'?idxOrUnit._lastVisualRect:null;
    if(last&&last.width>0&&last.height>0) return playHitVfxAtRect(last,amount,opt);
    if(!slot) return Promise.resolve();
  }
  return playHitVfxOnSlot(slot,amount,opt);
}

function _battleBackgroundFrameRect(){
  const scr=document.getElementById('scr-battle');
  const r=scr?.getBoundingClientRect?.();
  if(!r||!r.width||!r.height) return {left:0,top:0,width:window.innerWidth||3840,height:window.innerHeight||2160,scale:1};
  const scale=r.width/3840;
  return {left:r.left,top:r.top,width:r.width,height:r.height,scale};
}

// ── 特殊演出（生贄破棄・封印解放）── 定義の時間曲線で展開・収束を描く。
// forwardMsの合図でonMidpoint()を呼ぶ。SEと実処理の時刻は従来の入口に保持する。
function playSpecialProductionVfx(slot, sfxKey, vfxUrl, onMidpoint, options){
  const opt=options||{};
  const forwardMs=opt.forwardMs??200;
  const reverseMs=opt.reverseMs??200;
  const finishMidpoint=()=>{ if(onMidpoint) try{ onMidpoint(); }catch(e){ console.error('[SpecialVfx onMidpoint]',e); } };
  if(!slot||!vfxUrl){ finishMidpoint(); return Promise.resolve(); }
  const rect=slot.getBoundingClientRect();
  if(!rect.width||!rect.height){ finishMidpoint(); return Promise.resolve(); }
  if(sfxKey&&typeof playSfx==='function') playSfx(sfxKey,{group:'magic'});
  const clipRect=_battleBackgroundFrameRect();
  const clip=document.createElement('div');
  clip.className='special-vfx-clip';
  Object.assign(clip.style,{
    position:'fixed',
    left:`${clipRect.left}px`,
    top:`${clipRect.top}px`,
    width:`${clipRect.width}px`,
    height:`${clipRect.height}px`,
    zIndex:opt.zIndex??10001,
    pointerEvents:'none',
    overflow:'hidden',
  });
  const host=document.createElement('div');
  host.className='special-vfx-host';
  const scale=Math.max(1,Number(opt.scale)||1);
  const hostW=rect.width*scale, hostH=rect.height*scale;
  const hostLeft=rect.left+(rect.width-hostW)/2;
  const hostTop=opt.anchor==='bottom'
    ? rect.top+rect.height-hostH*0.62
    : rect.top+(rect.height-hostH)/2;
  const offsetY=Number(opt.offsetY)||0;
  Object.assign(host.style,{
    position:'absolute',left:`${hostLeft-clipRect.left}px`,top:`${hostTop+offsetY-clipRect.top}px`,
    width:`${hostW}px`,height:`${hostH}px`,
    pointerEvents:'none',overflow:'visible',
  });
  clip.appendChild(host);
  _vfxHostParent().appendChild(clip);
  if(typeof actionBannerTrackVfxHost==='function') actionBannerTrackVfxHost(clip);
  const playing=_playDefinedVfx(host,vfxUrl,forwardMs+reverseMs);
  return new Promise(resolve=>{
    setTimeout(finishMidpoint,forwardMs);
    setTimeout(()=>{ playing.stop(); clip.remove(); resolve(); },forwardMs+reverseMs);
  });
}

// 特殊演出は展開→収束の時間曲線。中点の合図と全尺は従来のまま。
// **逆再生の開始（onMidpoint）が「効果が確定する瞬間」**。生贄奉納はそこで消し、
// 召喚はそこで出す（逆の関係）。
const _SPECIAL_VFX_TIMING={forwardMs:750,reverseMs:750};
// 封印の解放（LAB の seal-release・K019。展開→収束の折り返しが解封の合図）。
// 2026-10-23 利用者指摘「サイズが合っていません。演出時間が長いです」：旧動画用の3倍の枠と 3.5秒（1750+1750）をやめ、
// カードの枠そのもの（LAB と同じ大きさ）で、折り返しまで 1000ms・全体 2000ms にする。
const _SEAL_RELEASE_VFX_TIMING={forwardMs:1000,reverseMs:1000};

// 生贄キャラを1体、S003演出付きで破棄する（封印解放の生贄コスト用）
function playSacrificeDestroyVfx(unit, side, onReverseStart){
  const slot=getCurrentUnitSlot(side,unit);
  // 生贄奉納の専用素材は廃止（登録が無いので演出なしで状態だけ進む）。
  const url=Assets?.vfx?.specialProduction?.S003||'';
  const slotH=slot?.getBoundingClientRect?.().height||0;
  return playSpecialProductionVfx(slot,'',url,()=>{
    unit.hp=0;
    unit._deathProcessed=true;
    unit._dp=true;
    unit._sacrificedForSeal=true;
    if(slot){
      slot.style.setProperty('transition','none','important');
      slot.style.setProperty('opacity','0','important');
    }
    if(typeof onReverseStart==='function'){
      try{ onReverseStart(unit); }catch(e){ console.error('[Sacrifice onReverseStart]',e); }
    }
  },{..._SPECIAL_VFX_TIMING,scale:4,fit:'cover',offsetY:-slotH*0.15});
}

// 戦闘中の召喚の登場演出。LABのbattle-summonの命中でカードを出す。
// 戻り値は「命中でカードが出た時点」で解決する（演出の後半は裏で続ける）。
function playSummonAppearVfx(unit, side){
  _syncEffectFlashWithVfx();
  const slot=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,unit):null;
  if(!slot||typeof playBattleLabFx!=='function') return Promise.resolve();
  slot.style.setProperty('visibility','hidden','important');
  return new Promise(resolve=>{
    let shown=false;
    const reveal=()=>{ if(shown) return; shown=true; slot.style.removeProperty('visibility'); resolve(); };
    // 2026-10-20 利用者指摘：召喚後の詰め直しでカードが動くと、光だけ元の位置に残っていた。カードに追従させる。
    playBattleLabFx('S001',unit,[unit],{side,onImpact:reveal,follow:true}).finally(reveal);
  });
}

// 封印を1体、既存の封印解放演出で解放する
// 戦闘中のユニットのレアリティ。ユニットは編成カードから作られる際に rarity を
// 引き継がないため、名前でカード定義（キャラクター／敵）を引いて補う。
// ホバー説明の見出し色（#kw-tooltip の rarity-N）に使う。
const _RARITY_BY_UNIT_NAME=new Map();
function _battleUnitRarity(unit){
  const direct=Number(unit&&unit.rarity);
  if(direct>=1&&direct<=6) return direct;
  const name=String(unit&&unit.name||'').trim();
  if(!name) return 0;
  if(_RARITY_BY_UNIT_NAME.has(name)) return _RARITY_BY_UNIT_NAME.get(name);
  let found=0;
  [typeof PANEL_POOL!=='undefined'?PANEL_POOL:null,
   typeof ENEMY_POOL!=='undefined'?ENEMY_POOL:null].forEach(pool=>{
    if(found||!Array.isArray(pool)) return;
    const def=pool.find(p=>p&&String(p.name||'').trim()===name&&Number(p.rarity)>=1);
    if(def) found=Number(def.rarity);
  });
  _RARITY_BY_UNIT_NAME.set(name,found);
  return found;
}
function playSealReleaseVfx(unit, side){
  _syncEffectFlashWithVfx();
  const slot=getCurrentUnitSlot(side,unit);
  const url=Assets?.vfx?.specialProduction?.[getKeywordAssetKey('封印')]||'';
  const fadeMs=Math.max(0,_SEAL_RELEASE_VFX_TIMING.forwardMs+_SEAL_RELEASE_VFX_TIMING.reverseMs-250);
  if(slot){
    slot.querySelectorAll('.seal-cost-badge').forEach(el=>{ el.style.display='none'; });
    const fadeEls=[...slot.children].filter(el=>!el.classList.contains('seal-cost-badge')&&!el.classList.contains('unit-hit-layer'));
    fadeEls.forEach(el=>{
      el.style.setProperty('transition',`filter ${fadeMs}ms ease-out`,'important');
      el.style.setProperty('filter','brightness(.45) saturate(.65)','important');
      // **filter は要素を新しい重なり文脈にする。**
      // ATK/HPは情報ブロックの中で z-index:9 にして枠レイヤー（z-index:4）より
      // 上に出しているが、その情報ブロック自身が z-index:auto のまま文脈になると
      // 中の 9 は内側だけの順位になり、数値が枠の絵の下へ潜って消える。
      // 封印中はCSS（.sealed-unit > :has(.slot-stats)）が同じことをしているが、
      // ここは sealed-unit を外した後なので、インラインで引き継ぐ。
      if(el.querySelector&&el.querySelector('.slot-stats')) el.style.setProperty('z-index','9','important');
    });
    // **ATK/HPの数値は暗転の間も読めるようにする。**
    // 封印中は CSS（.sealed-unit .slot-stats）が brightness(1.9) で持ち上げているが、
    // 下で sealed-unit を外すとその補正だけ先に消える。親の brightness(.45) がそのまま
    // かかり、白文字＋黒縁の数値が消えて見えていた（「解放でATKとHPが非表示になる」）。
    // 同じ補正をインラインで引き継ぎ、明るさと一緒に等倍へ戻す。
    const statEls=[...slot.querySelectorAll('.slot-stats')];
    statEls.forEach(el=>{
      el.style.setProperty('transition',`filter ${fadeMs}ms ease-out`,'important');
      el.style.setProperty('filter','brightness(1.9)','important');
    });
    // CSSの.sealed-unit子要素暗転を外した後、次フレームでインラインfilterを解除し、
    // S002の順再生+逆再生と同じ尺で明るくする。
    slot.classList.remove('sealed-unit');
    requestAnimationFrame(()=>{
      fadeEls.forEach(el=>el.style.setProperty('filter','brightness(1) saturate(1)','important'));
      statEls.forEach(el=>el.style.setProperty('filter','brightness(1)','important'));
    });
    setTimeout(()=>{
      fadeEls.forEach(el=>el.style.removeProperty('transition'));
      fadeEls.forEach(el=>el.style.removeProperty('filter'));
      fadeEls.forEach(el=>el.style.removeProperty('z-index'));
      statEls.forEach(el=>{ el.style.removeProperty('transition'); el.style.removeProperty('filter'); });
    },fadeMs+40);
  }
  return playSpecialProductionVfx(slot,getKeywordAssetKey('封印'),url,()=>{
    unit._sealed=false;
    delete unit._sealValue;
  },{..._SEAL_RELEASE_VFX_TIMING,scale:1});
}

// 攻撃キャラクターのカード先端を起点に、実際の距離・角度で対象群（最も左〜最も右、最も近い〜最も遠い）
// まで届く長さで炎を伸ばし、対象の角度範囲を回転しながら薙ぎ払うように動画を再生する。
// SEと合わせるため、再生時間（sweepDuration）は対象数・回転量に関わらず常に一定にする。
function _captureSweepSourceRect(unit,side){
  if(!unit) return null;
  const valid=r=>r&&Number.isFinite(r.left)&&Number.isFinite(r.top)
    &&Number.isFinite(r.width)&&Number.isFinite(r.height)&&r.width>0&&r.height>0;
  const id=String(unit.id);
  const motion=[...document.querySelectorAll('.attack-motion-clone[data-unit-id]')]
    .find(el=>String(el.dataset.unitId)===id);
  const slot=getCurrentUnitSlot(side,unit);
  for(const el of [motion,slot]){
    if(!el||el.isConnected===false||String(el.dataset.unitId)!==id
      ||el.classList.contains('dead-empty')) continue;
    const style=getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'
      ||Number(style.opacity)===0) continue;
    const rect=el.getBoundingClientRect();
    if(valid(rect)) return _copyBattleVisualRect(rect);
  }
  return valid(unit._lastVisualRect)?_copyBattleVisualRect(unit._lastVisualRect):null;
}

function playCharacterSweepVfx(unit,isEnemySide,targets,definitionRef,options){
  if(!definitionRef) return Promise.resolve();
  const opt=options||{};
  const sweepDuration=opt.sweepDuration||700;
  const targetSlots=(targets||[]).map(t=>getCurrentUnitSlot(isEnemySide?'ally':'enemy',t)).filter(Boolean);
  if(!targetSlots.length) return Promise.resolve();
  // **発生源は効果の演出の決まり（_captureUnitEffectRect）どおり、攻撃で踏み込んだ複製カードの位置。**
  // 定位置の枠から出すと、斜め前の敵へ踏み込んだ時にカードの左下など離れた所から炎が出た（2026-09-29 利用者報告）。
  const sourceRect=_captureSweepSourceRect(unit,isEnemySide?'enemy':'ally');
  if(!sourceRect) return Promise.resolve();
  // カード先端（味方なら上端＝敵陣営へ向く側）を発生源にする
  // 横はカード中央（2026-10-15 利用者指定「発生源のX軸がカード中央になるように」。以前は口元を想定した左寄り0.25）
  const originX=sourceRect.left+sourceRect.width*0.5;
  const originY=sourceRect.top+(isEnemySide?sourceRect.height:0);

  // 発生源から見た各対象の実際の角度・距離を計算する。これにより対象が1体で近くても、
  // 遠く（後衛）でも、正しい長さ・向きで炎が届く。
  // 表示しきれない枠（大きさ0＝左上の 0,0）を向きの計算に入れない。敵が大量に並んだ時（ケルピーの召喚など）、
  // それらが混ざると扇が画面の左上へ引っ張られ、左端へ攻撃したように見えていた（2026-09-27 利用者指摘）。
  const targetRects=targetSlots.map(s=>s.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  if(!targetRects.length) return Promise.resolve();
  const points=targetRects.map(r=>({x:r.left+r.width/2,y:r.top+r.height/2}));
  const angles=points.map(p=>Math.atan2(p.y-originY,p.x-originX)*180/Math.PI);
  const distances=points.map(p=>Math.hypot(p.x-originX,p.y-originY));
  const minAngle=Math.min(...angles), maxAngle=Math.max(...angles);
  const midAngle=(minAngle+maxAngle)/2;
  const halfSpread=Math.max(0,(maxAngle-minAngle)/2);
  const maxDist=Math.max(...distances);
  // 最も遠い対象（後衛）まで確実に届くよう、少し余裕を持たせた長さにする
  // （ユーザー確認により、届く長さをさらに2倍に調整済み）
  const length=Math.max(80,maxDist*1.2)*2;
  const startAngle=midAngle-halfSpread, endAngle=midAngle+halfSpread;

  const clipRect=_battleBackgroundFrameRect();
  const clip=document.createElement('div');
  clip.className='sweep-vfx-clip';
  Object.assign(clip.style,{
    position:'fixed',
    left:`${clipRect.left}px`,
    top:`${clipRect.top}px`,
    width:`${clipRect.width}px`,
    height:`${clipRect.height}px`,
    zIndex:10021,
    pointerEvents:'none',
    overflow:'hidden',
  });
  const host=document.createElement('div');
  host.className='sweep-vfx-host';
  Object.assign(host.style,{
    position:'absolute',
    left:`${originX-clipRect.left-length/2}px`,
    top:`${originY-clipRect.top-length/2}px`,
    width:`${length}px`,
    height:`${length}px`,
    zIndex:'auto',
  });
  clip.appendChild(host);
  _vfxHostParent().appendChild(clip);
  if(typeof actionBannerTrackVfxHost==='function') actionBannerTrackVfxHost(clip);
  const mediaEl=host;
  const playing=_playDefinedVfx(host,definitionRef,sweepDuration,{presentationSpeed:true});
  const stop=playing.stop;
  // widthは対象までの実距離から計算した「届く長さ」そのものなので、scale()で等倍拡大すると
  // 炎の先端が対象を大きく超えて伸びてしまい、発生源から見て炎が対象と無関係な場所まで届いて
  // しまう（＝カードから離れて見える）原因になる。太さ（height方向）だけをscaleYで拡大し、
  // 届く長さ（width方向）は変えないことで、発生源の位置・炎の届く範囲を保ったまま太くする。
  const sizeScale=opt.sizeScale||2;
  // 炎は startAngle から endAngle へ回る。各対象は自分の角度を通過した瞬間に「当たる」。
  // ダメージ数値はその時刻に出す（薙ぎ払いは対象ごとの命中VFXを出さないため、
  // ここで知らせないと数値がまったく出ない）。
  if(typeof opt.onTargetHit==='function'){
    angles.forEach((a,i)=>{
      // 0〜0.1は出現、0.1〜0.75で回り切る。その区間へ対象の角度を写す。
      const at=presentSweepTargetHitMs(a,startAngle,endAngle,sweepDuration);
      battlePresentationSetTimeout(()=>{ try{ opt.onTargetHit((targets||[])[i],i); }catch(e){ console.error('[sweep onTargetHit]',e); } },at);
    });
  }
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{ if(done) return; done=true; stop(); clip.remove(); resolve(); };
    if(typeof mediaEl.animate==='function'){
      const anim=mediaEl.animate([
        {transform:`rotate(${startAngle}deg) scaleY(${sizeScale})`,opacity:0},
        {transform:`rotate(${startAngle}deg) scaleY(${sizeScale})`,opacity:1,offset:0.1},
        {transform:`rotate(${endAngle}deg) scaleY(${sizeScale})`,opacity:1,offset:0.75},
        {transform:`rotate(${endAngle}deg) scaleY(${sizeScale})`,opacity:0,offset:1},
      ],{duration:sweepDuration,easing:'ease-in-out',fill:'forwards'});
      anim.addEventListener('finish',finish,{once:true});
    }else{
      // Web Animations API非対応端末でも、アラッサスの従来VFXを消失させない。
      mediaEl.style.transform=`rotate(${endAngle}deg) scaleY(${sizeScale})`;
      mediaEl.style.opacity='1';
    }
    battlePresentationSetTimeout(finish,sweepDuration+400);
  });
}

// カードDOMを作り直さず、HP数値とライフバーだけを即座に更新する（applyDamageBatch用の軽量更新）
function updateUnitDamageUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const _atkVal=Math.max(0,typeof presentShownAtk==='function'?presentShownAtk(unit):(unit.atk||0));
  const _hpVal=Math.max(0,typeof presentShownHp==='function'?presentShownHp(unit):(unit.hp||0));
  // 倒れた瞬間は桁数が減る（例：9999→0）。ここで作り直すと、消える直前に
  // 数字だけ大きくなって目立つので、大きさは据え置く。
  const _keepSize=_hpVal<=0;
  const atkEl=slot.querySelector('.slot-stats .a');
  _setUnitStatText(atkEl,_atkVal,_hpVal,_keepSize);
  const hpEl=slot.querySelector('.slot-stats .h');
  if(hpEl){
    _setUnitStatText(hpEl,_hpVal,_atkVal,_keepSize);
    hpEl.classList.toggle('hp-damaged',_hpVal<(typeof presentShownMaxHp==='function'?presentShownMaxHp(unit):Math.max(1,unit.maxHp||unit.hp||1)));
  }
  const maxHp=typeof presentShownMaxHp==='function'?presentShownMaxHp(unit):Math.max(1,Number(unit.maxHp)||Number(unit.hp)||1);
  const rate=Math.max(0,Math.min(1,_hpVal/maxHp));
  const fill=slot.querySelector('.slot-life-fill');
  if(fill) fill.style.width=`${rate*100}%`;
  const bar=slot.querySelector('.slot-life-bar');
  if(bar) bar.title=`${_lifeLabelText()} ${_hpVal}/${maxHp}`;
  // 攻撃効果の停止中も、見えている複製をイベントごとに進める。
  // 実枠だけを更新すると、本来の攻撃と最初の割り込みの共振がまとめて+2/+2に見える。
  if(typeof battleMotionClone==='function') _syncMotionCloneStats(battleMotionClone(unit),slot);
}
// 戦闘中、ATK/HPを変化させる効果が発動するたびに呼び出し、両陣営の生存ユニット全員の
// 外観の数値（ATK/HP）を即座に更新する（renderAll()のようなカード再構築は行わない軽量版）。
// 例：アラクネの「負傷：全ての敵はATK-1を得る」等、ダメージを受けていないユニットの
// ステータスも変化する効果がある場合、そのユニットの表示も同時に更新する必要があるため。
function _refreshAllUnitStatsUi(){
  // 死亡処理・盤面詰めより先にHP0を表示するため、死亡ユニットも更新する。
  (G.allies||[]).forEach(u=>{ if(u) updateUnitDamageUi(u,'ally'); });
  (G.enemies||[]).forEach(u=>{ if(u) updateUnitDamageUi(u,'enemy'); });
}

// シールド消費時、カードDOMを作り直さずshield-active/魔方陣レイヤーだけを即座に更新する
// 戦闘中の1体のホバー説明（data-preview）だけを作り直す。作り方は renderField() と同じ。
// 説明は盤面を描いた時にしか作られないため、開戦で弱体・毒を付けても、次に盤面を描き直す（最初の攻撃）まで
// 古い説明のまま「弱体1」が出なかった（タイタン。2026-09-29 利用者報告）。付与の瞬間にここを呼ぶ。
function refreshUnitPreviewUi(unit,side){
  if(!unit) return false;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return false;
  const list=side==='enemy'?(G.enemies||[]):(G.allies||[]);
  const idx=list.indexOf(unit);
  const plainDesc=unit.desc?_stripKeywordsFromDesc(_stripBattleParentheticalText(_rawSubstitutedDesc(unit)),unit):'';
  const preview=_unitPreviewText(unit,plainDesc,_unitDescSlotIdx(unit,idx>=0?idx:0));
  if(!preview) return false;
  slot.setAttribute('data-preview',preview);
  slot.querySelectorAll('.unit-hit-layer').forEach(el=>el.setAttribute('data-preview',preview));
  const description=slot.querySelector('.slot-desc');
  if(description) description.outerHTML=_unitCombinedDescHtml(unit,plainDesc,_unitDescSlotIdx(unit,idx>=0?idx:0));
  return true;
}

function updateUnitShieldUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const shown=typeof presentShownShield==='function'?presentShownShield(unit):(Number(unit.shield)||0);
  slot.classList.toggle('shield-active',shown>0);
  slot.querySelectorAll('.unit-shield-layer').forEach(el=>el.remove());
  if(typeof battleFxSyncUnit==='function') battleFxSyncUnit(unit,side,slot);
}

// クローンは画面スケール変換(--game-scale)の外(document.body直下)に置かれるため、
// 元要素の computed フォントサイズをそのままコピーすると等倍(未縮小)で表示され巨大化する。
function _gameScale(){
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
}
function _getAttackTargetRect(slot){
  const rect=slot?.getBoundingClientRect?.();
  if(!rect) return rect;
  // 詰めアニメーション中は getBoundingClientRect() が移動途中の値になる。
  // slot.style.left は `calc(...)` なので parseFloat では終点を復元できず、
  // 対象が並び替え中だと複製カードもカードの間へ吸い寄せられていた。
  // FLIPのtransformだけを一時的に外す共通の実測で、必ず落ち着き先を返す。
  return (typeof _settledRectOf==='function'&&_settledRectOf(slot))||rect;
}

function renderAll(){
  // FLIPの移動元を作った直後に、攻撃ダメージ表示・HUD更新などの別経路が
  // renderAll()を呼ぶと、移動中のslotが再生成されてtransition開始前に破棄される。
  // 初回描画（_animateBattleCompact中）は通し、それ以外の260msだけ盤面再構築を
  // 保留して、終了後に最新状態を1回だけ反映する。通常モード／人数変化なしでは
  // このガードは一切発生しない。
  const compactUntil=Number(G&&G._battleCompactAnimatingUntil)||0;
  if(!G._animateBattleCompact&&compactUntil>performance.now()){
    G._compactRenderPending=true;
    if(!G._compactRenderTimer){
      G._compactRenderTimer=window.setTimeout(()=>{
        G._compactRenderTimer=0;
        if(!G._compactRenderPending) return;
        G._compactRenderPending=false;
        if(typeof renderAll==='function') renderAll();
      },Math.max(0,compactUntil-performance.now()+8));
    }
    return;
  }
  if(typeof _recordRunStatsSnapshot==='function') _recordRunStatsSnapshot();
  // 戦闘中（player/enemyフェイズ）はログ表示（枠・見出し含む）を隠す
  document.body.classList.toggle('battle-turn-active',G.phase==='player'||G.phase==='enemy');
  renderField('f-ally',  G.allies,  false);
  renderField('f-enemy', G.enemies, true);
  renderHand();
  renderManaHud();
  renderControls();
  updateHUD();
}

function renderManaHud(){
  let hud=document.getElementById('mana-hud');
  if(!hud){
    hud=document.createElement('div');
    hud.id='mana-hud';
    document.body.appendChild(hud);
  }
  // 戦闘中は右下の専用カウンターを使う。旧HUDはbody直下に生成されるため、
  // #scr-battle側のCSSだけでは右上のマナ表示を確実に隠せない。
  const isBattleScreen=document.getElementById('scr-battle')?.classList.contains('active');
  const show=!isBattleScreen&&G&&G.phase&&G.phase!=='reward'&&G.phase!=='gameover';
  hud.style.display=show?'grid':'none';
  if(!show) return;
  const n=Math.max(0,Number(G.mana)||0);
  const path=typeof _manaOrbPath==='function'?_manaOrbPath():'';
  hud.innerHTML=`<div class="mana-row">${path?`<img class="mana-icon" src="${path}" alt="マナ">`:''}<b>${n}</b></div>`;
  const clip=_battleBackgroundFrameRect();
  const padX=3840*.047*(clip.scale||1);
  const padY=2160*.06*(clip.scale||1);
  const rowWidth=Math.max(74*(clip.scale||1),hud.getBoundingClientRect().width||0);
  hud.style.position='fixed';
  hud.style.left=`${clip.left+clip.width-rowWidth-padX}px`;
  hud.style.right='auto';
  hud.style.top=`${clip.top+padY}px`;
}

// 詰め保留へ入る直前の盤面を、次の共通FLIPの移動元として保存する。
// visibility:hidden は位置情報を失わせないので通常スロットをまず読む。
// 既にスロットがDOMから外れていた場合だけ、画面上を動く複製を補助に使う。
function captureBattleCompactPreviousRects(){
  if(G._battleCompactPreviousRects instanceof Map) return;
  // 死亡を伴わない演出中の再描画まで保存すると、後の別の詰めへ
  // 無関係な古い矩形を持ち込むため、死亡が見えている時だけ退避する。
  const hasDead=[...(G.allies||[]),...(G.enemies||[])]
    .some(u=>u&&u.hp<=0&&!u._isSoul&&!u._isObject);
  if(!hasDead) return;
  const rects=new Map();
  ['f-ally','f-enemy'].forEach(fieldId=>{
    const field=document.getElementById(fieldId);
    if(!field) return;
    field.querySelectorAll('.slot[data-unit-id]').forEach(slot=>{
      const rect=slot.getBoundingClientRect();
      if(rect&&rect.width>0&&rect.height>0) rects.set(String(slot.dataset.unitId),_copyBattleVisualRect(rect));
    });
  });
  document.querySelectorAll('.attack-motion-clone[data-unit-id]').forEach(clone=>{
    const unitId=String(clone.dataset.unitId||'');
    if(!unitId||rects.has(unitId)) return;
    const rect=clone.getBoundingClientRect();
    if(rect&&rect.width>0&&rect.height>0) rects.set(unitId,_copyBattleVisualRect(rect));
  });
  G._battleCompactPreviousRects=rects;
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('battle_compact_previous_rects_held',{count:rects.size,ids:[...rects.keys()]});
}

function _captureFieldVisualState(el,units){
  const previousRects=new Map();
  // 攻撃モーション中の死亡では、モーション終了まで詰めを保留する間に
  // 元スロットが空枠へ置き換わったり、攻撃用複製だけが残ったりする。
  // 死亡を検知した瞬間に退避した矩形を優先し、詰め後の残存体へ
  // 「死亡した瞬間の位置」からFLIPを掛ける。両陣営で同じ入口を使うため、
  // PvE・オンラインで矩形の取り方を分けない。
  const heldRects=G._battleCompactPreviousRects;
  // 死亡演出の複製元。スロットは毎回createElementで作り直されるため、
  // 消える前のDOMをここで控えておかないと「生きていたときの見た目」が取れない。
  // 全スロットを複製すると無駄なので、今回死んだユニットの分だけに絞る。
  // 再生中に位置を据え置くため、今画面にあるカードの left を控える。
  const previousLefts=new Map();
  for(const oldSlot of el.querySelectorAll('.slot[data-unit-id]')){
    const left=oldSlot.style&&oldSlot.style.left;
    if(left) previousLefts.set(String(oldSlot.dataset.unitId||''),left);
  }
  // 「直前までカードが出ていた」体だけを対象にする。配列には前の波の死体など
  // 一度も描かれていない体が残っていることがあり、それらまで数えると生存数が
  // 水増しされて、盤面全体の中央寄せ位置がずれる。
  const dyingIds=new Set((units||[]).filter(x=>x&&x.hp<=0&&!x._deathFxDone&&x.id!=null
    &&previousLefts.has(String(x.id))).map(x=>String(x.id)));
  const previousSlots=new Map();
  {
    for(const oldSlot of el.querySelectorAll('.slot[data-unit-id]')){
      previousRects.set(oldSlot.dataset.unitId,oldSlot.getBoundingClientRect());
      // 死亡イベントの効果VFXは、死亡処理後に盤面を詰め直してから再生される。
      // その時点では旧スロットが空枠へ置き換わっているため、死亡直前の矩形を
      // ユニットへ保持し、マミー等の死亡効果が対象DOM消去後でも同じ位置へ出る
      // ようにする。次の生存描画では通常のDOM矩形を再び優先する。
      const visualUnit=(units||[]).find(x=>x&&String(x.id)===String(oldSlot.dataset.unitId));
      if(visualUnit&&visualUnit.hp<=0){
        const r=oldSlot.getBoundingClientRect();
        if(r&&r.width>0&&r.height>0) visualUnit._lastVisualRect=_copyBattleVisualRect(r);
      }
      if(dyingIds.has(oldSlot.dataset.unitId)&&oldSlot.childElementCount>0){
        const clone=oldSlot.cloneNode(true);
        clone.dataset.deathSourceWidth=String(oldSlot.offsetWidth||0);
        clone.dataset.deathSourceHeight=String(oldSlot.offsetHeight||0);
        previousSlots.set(oldSlot.dataset.unitId,clone);
      }
    }
    if(heldRects){
      heldRects.forEach((rect,unitId)=>{
        if(rect&&rect.width>0&&rect.height>0) previousRects.set(String(unitId),rect);
      });
    }
  }
  return {previousRects,previousLefts,dyingIds,previousSlots};
}

function _layoutBattleFieldRows(el,units,isEnemy,previousLefts,_frontIndexes,_rearIndexes,frontSlots){
  const _fieldW=`calc(var(--unit-card-w) * ${frontSlots} + var(--unit-field-gap) * ${frontSlots-1})`;
  const _unitX=(count,pos)=>`calc((${_fieldW} - var(--unit-card-w)) / 2 + (${pos} - (${count} - 1) / 2) * (var(--unit-card-w) + var(--unit-field-gap)))`;
  // 奪う演出の待機中は、奪われた体が元いた場所をレイアウト上だけ空けておく。
  // カード本体は既に移動先の配列にあるため、元配列へ戻すと戦闘状態を壊す。
  // 代わりに元位置の並びへ描画専用の空席を差し込み、残った敵が複製へ
  // 重なるのを防ぐ。動き出す瞬間に origin.released を立てて通常の詰めへ戻す。
  const _fieldSide=isEnemy?'p2':'p1';
  const _stealOrigins=[...(G.allies||[]),...(G.enemies||[])]
    .map(u=>u&&u._stealPendingPresent&&u._stealPresent&&u._stealPresent.origin)
    .filter(origin=>origin&&!origin.released&&origin.detached!==false&&origin.side===_fieldSide);
  const _layoutWithStealOrigins=(indexes,lane)=>{
    const entries=indexes.map(idx=>({idx}));
    _stealOrigins.filter(origin=>origin.lane===lane)
      .sort((a,b)=>a.position-b.position)
      .forEach(origin=>entries.splice(Math.max(0,Math.min(entries.length,Number(origin.position)||0)),0,{ghost:true}));
    const positions=new Map();
    entries.forEach((entry,pos)=>{ if(!entry.ghost) positions.set(entry.idx,pos); });
    return {count:entries.length,positions};
  };
  const _rearLayout=_layoutWithStealOrigins(_rearIndexes,'rear');
  const _frontLayout=_layoutWithStealOrigins(_frontIndexes,'front');
  // 人数が変わった直後の再描画では、compact が保留されているため既存カードの
  // left 式は前回の人数を基準にしている。新しい召喚体だけを新人数で計算すると
  // 半枚ずれて重なるので、フィールド要素に列ごとの基準人数を保持する。
  // 基準人数の更新は、既存カードの left も書き換える描画だけで行う。
  // holdLayout 中は既存カードへ previousLefts の旧 left を入れ直すため、
  // 新規カードも同じ旧人数を基準にして半枚ずれを防ぐ。
  const holdLayout=!!(G._compactHoldSides&&G._compactHoldSides[isEnemy?'enemies':'allies']
    &&(G._animateBattleCompact||performance.now()<Number(G._battleCompactAnimatingUntil||0)));
  const _layoutIsBeingRewritten=!holdLayout;
  // その列に据え置き中の既存カード（旧 left を持つ体）が1枚も無ければ、重なる相手がいないので新しい人数で置く。
  // 後衛のエピトメが攻撃中に前衛へボスを召喚した時、前衛の旧人数0を基準にして半枚右へずれ、
  // 攻撃が終わってから中央へ動いていた（利用者報告）。
  const _laneHasHeld=indexes=>indexes.some(idx=>{
    const uid=units[idx]&&units[idx].id!=null?String(units[idx].id):'';
    return !!uid&&previousLefts.has(uid);
  });
  const _storedLayoutCount=(key,count,indexes)=>{
    const old=Number(el.dataset[key]);
    if(_layoutIsBeingRewritten||!Number.isFinite(old)||old<0||!_laneHasHeld(indexes)){
      el.dataset[key]=String(count);
      return count;
    }
    return old;
  };
  const _frontBaseCount=_storedLayoutCount('layoutFrontCount',_frontLayout.count,_frontIndexes);
  const _rearBaseCount=_storedLayoutCount('layoutRearCount',_rearLayout.count,_rearIndexes);
  const _rearLeft=new Map(_rearIndexes.map(idx=>[idx,_unitX(_rearBaseCount,_rearLayout.positions.get(idx))]));
  const _frontLeft=new Map(_frontIndexes.map(idx=>[idx,_unitX(_frontBaseCount,_frontLayout.positions.get(idx))]));
  // 相手側の人数変化で攻撃中の陣営まで中央寄せしない。
  if(holdLayout){
    [..._frontIndexes,..._rearIndexes].forEach(idx=>{
      const uid=units[idx]&&units[idx].id!=null?String(units[idx].id):'';
      const oldLeft=previousLefts.get(uid);
      if(!oldLeft) return;
      if(_frontIndexes.includes(idx)) _frontLeft.set(idx,oldLeft);
      else _rearLeft.set(idx,oldLeft);
    });
  }
  return {_unitX,_rearLeft,_frontLeft};
}

function _renderBattleUnitContent(slot,u,i,isEnemy){
  // ライブユニットは常にユニットとして描画する（moveMask は死亡スロットにのみ表示）
  {
    // **結界は表示専用の値で描く**（present.js）。実体を直に描くと、
    // 結界を割った演出（既存素材）より先に shield.png が消える。
    const _shownShield=typeof presentShownShield==='function'?presentShownShield(u):(Number(u.shield)||0);
    const gradeTag='';
    const _rawDesc=u.desc?_stripBattleParentheticalText(_rawSubstitutedDesc(u)):'';
    const _desc=_stripKeywordsFromDesc(_rawDesc,u);
    const _descSlot=_unitDescSlotIdx(u,i);
    const descTag=_unitCombinedDescHtml(u,_desc,_descSlot);
    // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
    // 既にアイコン化済みの_desc（<img alt="マナ">を含む）ではなくプレーンテキストを渡す
    // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
    const _plainDesc=u.desc?_stripKeywordsFromDesc(_stripBattleParentheticalText(_rawSubstitutedDesc(u)),u):'';
    const _preview=_unitPreviewText(u,_plainDesc,_descSlot);
    if(_preview) slot.setAttribute('data-preview',_preview);
    // 説明の見出し左の色アイコン。味方はカードの色、**敵は常に黒**（2026-09-24 利用者指定）。
    // 編成画面のカード（render.js の mkCardEl）と同じ属性で渡す。付け忘れていたため戦闘中だけ出なかった。
    const _previewColor=isEnemy?'黒':String(u.color||'');
    if(_previewColor) slot.setAttribute('data-preview-title-color',_previewColor);
    // 画面に出す値は present.js が唯一の実装。演出の再生中は
    // 「まだ見せていない変化」を反映しない（数値が出る前にHPが減らない）。
    const _shownAtk=typeof presentShownAtk==='function'?presentShownAtk(u):(u.atk||0);
    const _shownHp=typeof presentShownHp==='function'?presentShownHp(u):(u.hp||0);
    const _shownMaxHp=typeof presentShownMaxHp==='function'?presentShownMaxHp(u):Math.max(1,u.maxHp||u.hp||1);
    const _hpClass=(_shownHp<_shownMaxHp)?'h hp-damaged':'h';
    // ATK/HPで縮小率が食い違わないよう、桁数の多い方に合わせた同じクラスを両方へ当てる。
    const _statPairCls=_cardStatPairDigitClass(_shownAtk,_shownHp);
    const _hpMax=_shownMaxHp;
    const _hpPct=Math.max(0,Math.min(100,Math.round((Math.max(0,_shownHp)/_hpMax)*100)));
    const hpBar=`<div class="slot-life-bar" title="${_escapePreviewHtml(_lifeLabelText())} ${Math.max(0,_shownHp)}/${_hpMax}"><div class="slot-life-fill" style="width:${_hpPct}%"></div></div>`;
    const raceTag='';
    // 情報ブロック：絶対配置でカード全体に広げ中央固定
    // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
    const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
    const _btmStyle='position:absolute;bottom:6px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0;z-index:1;pointer-events:auto';
    slot.style.borderTop='2px solid var(--teal2)';
    if(_shownShield>0) slot.classList.add('shield-active'); else slot.classList.remove('shield-active');
    // .unit-portraitの子として配置することで、attack-motion-clone生成時にportrait用のCSS変数
    // (--new-card-art-left等)がそのまま効き、独立した%指定を並行して持つことによるズレ・変形を防ぐ
    const shieldLayer=''; // 結界の状態表示はLABのshield-stateに統一。
    const manaOrbHtml=typeof cardManaCostHtml==='function'?cardManaCostHtml(u):'';
    const sealCostHtml=typeof cardSealCostHtml==='function'?cardSealCostHtml(u):'';
    if(isEnemy){
      slot.innerHTML=`${manaOrbHtml}${sealCostHtml}<div class="unit-frame-layer"></div><div class="unit-stat-overlay-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}"><div class="slot-name">${_battleDisplayUnitName(typeof battleFxShownForm==='function'?battleFxShownForm(u).name:u.name)}</div>${raceTag}<div class="slot-stats"><span class="a${_statPairCls}">${_shownAtk}</span><span class="s">/</span><span class="${_hpClass}${_statPairCls}">${_shownHp}</span></div></div><div style="${_btmStyle}">${descTag}</div>`;
    } else {
      slot.innerHTML=`${manaOrbHtml}${sealCostHtml}<div class="unit-frame-layer"></div><div class="unit-stat-overlay-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}"><div class="slot-name">${_battleDisplayUnitName(typeof battleFxShownForm==='function'?battleFxShownForm(u).name:u.name)}</div>${raceTag}<div class="slot-stats"><span class="a${_statPairCls}">${_shownAtk}</span><span class="s">/</span><span class="${_hpClass}${_statPairCls}">${_shownHp}</span></div></div><div style="${_btmStyle}">${descTag}</div>`;
    }
    const _battleFrameLayer=slot.querySelector('.unit-frame-layer');
    if(_battleFrameLayer){
      _battleFrameLayer.style.setProperty('border','2px solid #c49a6c','important');
      _battleFrameLayer.style.setProperty('border-width','2px','important');
      _battleFrameLayer.style.setProperty('background-origin','border-box','important');
    }
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(slot,u);
    const hitLayer=document.createElement('div');
    hitLayer.className='unit-hit-layer';
    if(_preview) hitLayer.setAttribute('data-preview',_preview);
    if(_previewColor) hitLayer.setAttribute('data-preview-title-color',_previewColor);
    slot.appendChild(hitLayer);
    slot._hitLayer=hitLayer;
    if(!isEnemy&&typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(hitLayer,u,i);
  }
}

function _wireBattleUnitControls(slot,u,i,isEnemy){
  if(u&&!isEnemy){
    const canMoveUnit=!isEnemy&&G.phase==='reward'&&!G._battlePhaseRunning&&!G._resolvingSeals&&!G._mapBattle;
    slot.draggable=canMoveUnit;
    slot.addEventListener('dragstart',e=>{
      if(!canMoveUnit||document.body.classList.contains('right-card-peek')) { e.preventDefault(); return; }
      if(typeof _libraryTutorialIsMoveStep==='function'&&_libraryTutorialIsMoveStep()) { e.preventDefault(); return; }
      window._allySlotDragSrc=i;
      e.dataTransfer.effectAllowed='move';
      if(typeof _transparentDragImg!=='undefined') e.dataTransfer.setDragImage(_transparentDragImg,0,0);
      slot.classList.add('dragging');
      if(typeof _createDragGhost==='function') _createDragGhost(slot);
      if(typeof _moveDragGhost==='function') _moveDragGhost(e.clientX,e.clientY);
    });
    slot.addEventListener('drag',e=>{ if(typeof _moveDragGhost==='function'&&e.clientX&&e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    slot.addEventListener('dragend',()=>{ window._allySlotDragSrc=null; slot.classList.remove('dragging'); if(typeof _removeDragGhost==='function') _removeDragGhost(); });
    slot.addEventListener('dragover',e=>{
      if(!canMoveUnit||window._allySlotDragSrc==null) return;
      e.preventDefault();
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
    slot.addEventListener('drop',e=>{
      if(!canMoveUnit) return;
      const src=window._allySlotDragSrc;
      if(src==null) return;
      if(typeof _libraryTutorialAllowsMove==='function'&&!_libraryTutorialAllowsMove(G.allies[src],i)) { window._allySlotDragSrc=null; return; }
      e.preventDefault();
      slot.classList.remove('drag-over');
      if(src!==i){
        const frontSlots=ENEMY_FRONT_SLOTS||7;
        if((src>=frontSlots)!==(i>=frontSlots)){
          window._allySlotDragSrc=null;
          renderAll();
          return;
        }
        const tmp=G.allies[src];
        G.allies[src]=G.allies[i];
        G.allies[i]=tmp;
        if(G.allies[i]) G.allies[i].lane=i>=frontSlots?'rear':'front';
        if(G.allies[src]) G.allies[src].lane=src>=frontSlots?'rear':'front';
        renderAll();
      }
      window._allySlotDragSrc=null;
    });
    slot.onclick=()=>{
      if(G.phase==='player') return;
      if(G._selectedBoardUnitIdx!==i) G._selectedBoardCardIdx=null;
      G._selectedBoardUnitIdx=i;
      G._showGlobalPanels=false;
      renderAll();
      if(typeof renderHandEditor==='function') renderHandEditor();
    };
    if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
  }
  if(u&&isEnemy&&u.hp>0&&G.phase==='player'){
    slot.onclick=()=>{
      const unitIdx=G._selectedBoardUnitIdx;
      const boardIdx=G._selectedBoardCardIdx;
      const ally=G.allies&&G.allies[unitIdx];
      const card=ally&&ally.boardCards&&ally.boardCards[boardIdx];
      if(!ally||ally.hp<=0||boardIdx==null||boardIdx<0||!card) return;
      if(typeof useDraggedSpellOnTarget==='function'){
        const prev=G.spells;
        G.spells=ally.boardCards;
        G._boardSpellRestore=prev;
        useDraggedSpellOnTarget(boardIdx,'enemy',i);
        if(typeof _restoreBoardSpellSource==='function') _restoreBoardSpellSource();
      }
    };
    if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
  }
  if(u&&u.hp>0&&G.phase==='player'&&typeof useDraggedSpellOnTarget==='function'){
    slot.addEventListener('dragover',e=>{
      const si=window._spellDragIdx;
      if(si==null) return;
      const sp=G.spells&&G.spells[si];
      const who=isEnemy?'enemy':'ally';
      if(!sp) return;
      if((sp.needsEnemy&&who!=='enemy')||(sp.needsAlly&&who!=='ally')) return;
      if(!sp.needsEnemy&&!sp.needsAlly&&!sp.needsAny) return;
      e.preventDefault();
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
    slot.addEventListener('drop',e=>{
      const si=window._spellDragIdx;
      if(si==null) return;
      e.preventDefault();
      slot.classList.remove('drag-over');
      useDraggedSpellOnTarget(si,isEnemy?'enemy':'ally',i);
      window._spellDragIdx=null;
    });
  }
}

function _animateBattleFieldCompact(el,id,previousRects){
  // renderFieldはスロットを再生成するため、通常のtransitionだけでは
  // 移動前の位置を失ってしまう。FLIPで旧位置から新位置へ滑らかに移動させる。
  if(G._animateBattleCompact&&previousRects.size){
    _recordBattleTrace('battle_compact_snapshot',{field:id,previousRects:previousRects.size,currentSlots:el.querySelectorAll('.slot[data-unit-id]').length,ids:[...previousRects.keys()]});
    // 新しいDOMを作った同じ同期処理内で移動元transformを設定する。
    // ここを最初のrequestAnimationFrame内で行うと、連続召喚・攻撃終了時の
    // renderAll()に上書きされ、ブラウザが移動元を一度も描画せず瞬間移動になる。
    let compactMatched=0;
    for(const slot of el.querySelectorAll('.slot[data-unit-id]')){
        const oldRect=previousRects.get(slot.dataset.unitId);
        if(!oldRect) continue;
        // 多段攻撃の接触直後に相手側の人数が変わっても、攻撃者自身へ
        // FLIP移動を掛けない。これがあると攻撃者が左右へ一度動いて戻る。
        if((G._suppressNextCompactUnitIds&&G._suppressNextCompactUnitIds.has(String(slot.dataset.unitId)))
          ||(G._suppressCompactUnitIds&&G._suppressCompactUnitIds.has(String(slot.dataset.unitId)))) continue;
        compactMatched++;
        const newRect=slot.getBoundingClientRect();
        const dx=oldRect.left-newRect.left;
        const dy=oldRect.top-newRect.top;
        if(Math.abs(dx)<0.5&&Math.abs(dy)<0.5) continue;
        // grid の position:relative 要素へ absolute な left/top を設定すると、
        // 「目標位置そのもの」ではなく元の grid 配置からさらにオフセットされる。
        // そのため人数変化時のFLIPは相対移動量を transform で扱う。
        const dxScaled=oldRect.left-newRect.left;
        const dyScaled=oldRect.top-newRect.top;
        const moveKey=String(slot.dataset.unitId);
        const compactMoves=G._battleCompactMoves||(G._battleCompactMoves=new Map());
        compactMoves.set(moveKey,{dx:dxScaled,dy:dyScaled,start:performance.now(),duration:260});
        _recordBattleTrace('battle_compact_flip',{unitId:slot.dataset.unitId,oldLeft:oldRect.left,oldTop:oldRect.top,newLeft:newRect.left,newTop:newRect.top,dx,dy});
        slot.style.setProperty('transition','none','important');
        slot.style.setProperty('transform',`translate(${dxScaled}px,${dyScaled}px)`,'important');
        // 新しいslotへ設定した移動元transformをこのフレーム中に確定する。
        // これを省くと、ブラウザが「移動元」と「移動先」を同一レイアウトとして
        // 折りたたみ、transitionが発火せず瞬間移動になることがある。
        void slot.offsetWidth;
        requestAnimationFrame(()=>{
          if(!slot.isConnected) return;
          _recordBattleTrace('battle_compact_transition_start',{unitId:slot.dataset.unitId,dx:dxScaled,dy:dyScaled});
          slot.style.setProperty('transition','transform 260ms ease','important');
          void slot.offsetWidth;
          slot.style.setProperty('transform','translate(0,0)','important');
          window.setTimeout(()=>{
            if(!slot.isConnected) return;
            _recordBattleTrace('battle_compact_transition_sample',{unitId:slot.dataset.unitId,
              transform:getComputedStyle(slot).transform,elapsed:performance.now()-compactMoves.get(moveKey)?.start});
          },130);
          window.setTimeout(()=>{
            if(!slot.isConnected) return;
            slot.style.removeProperty('transition');
            slot.style.removeProperty('transform');
            const current=G._battleCompactMoves;
            if(current&&current.get(moveKey)?.start===compactMoves.get(moveKey)?.start) current.delete(moveKey);
          },320);
        });
      }
    _recordBattleTrace('battle_compact_prepare',{field:id,previousRects:previousRects.size,currentSlots:el.querySelectorAll('.slot[data-unit-id]').length,matched:compactMatched});
  }
}

function renderField(id,units,isEnemy,_lane){
  const el=document.getElementById(id);
  const {previousRects,previousLefts,dyingIds,previousSlots}=_captureFieldVisualState(el,units);
  el.innerHTML='';
  // 優先ターゲットのインデックスを特定（グループ全体をハイライト）
  // _isObject のユニットは攻撃対象外なので除外
  // コアが生成済みだが、まだsummonイベントを再生していないユニットは
  // 上限判定のため配列に残る一方、画面上の配置枠は占有しない。
  // ここを生存ユニットとして数えると、非表示のpending体ぶんだけ既存体が
  // 左右へずれ、召喚上限時に一瞬左端へ飛ぶ。
  // 奪取対象はコア上では既に移動先配列にいるが、演出が動き出すまでは
  // 移動先の人数にもDOMにも含めない。visibilityだけで隠すと中央寄せ計算には
  // 数えられ、死んだ発動元（サキュバス）や既存の味方が先に場所を空けて動く。
  const _stealAwaitingMove=u=>!!(u&&u._stealPendingPresent&&u._stealPresent
    &&u._stealPresent.origin&&!u._stealPresent.origin.released
    &&u.side!==u._stealPresent.origin.side);
  const _keepDying=typeof presentIsPlaying==='function'&&presentIsPlaying();
  // コアは多段攻撃1手ぶんを先に確定するため、実体HPは「復活後に再び死亡」した
  // 最終値0でも、再生位置では生存していることがある。配置・描画は表示HPを正とする。
  const _visualHp=u=>_keepDying&&typeof presentShownHp==='function'?presentShownHp(u):Number(u&&u.hp)||0;
  // 死亡枠を残した描画は、IDの並びが次の描画と同じでも「詰め待ち」の状態である。
  // これを記録しないと、再生終了後の requestBattleCompact() が変更なしと判定し、
  // 空いた位置を次の死亡まで残してしまう。保留時の旧矩形もここで保存し、
  // 再生終了後の最初の共通compactで、その位置からFLIPを開始できるようにする。
  const heldGapSide=isEnemy?'enemies':'allies';
  const hasHeldGap=_keepDying&&dyingIds.size>0&&units.some(u=>u&&_visualHp(u)>0);
  if(hasHeldGap){
    const heldGaps=G._battleCompactHeldGaps||(G._battleCompactHeldGaps={allies:false,enemies:false});
    heldGaps[heldGapSide]=true;
    if(!(G._battleCompactPreviousRects instanceof Map)&&previousRects.size){
      G._battleCompactPreviousRects=new Map([...previousRects].map(([unitId,rect])=>[unitId,_copyBattleVisualRect(rect)]));
      if(typeof _recordBattleTrace==='function') _recordBattleTrace('battle_compact_previous_rects_held',{
        count:previousRects.size,ids:[...previousRects.keys()],reason:'death_gap'
      });
    }
  }
  const liveUnits=units.map((u,i)=>({u,i})).filter(x=>x.u&&_visualHp(x.u)>0&&!x.u._corePendingSummon
    &&!_stealAwaitingMove(x.u)&&!x.u._isObject);
  const prioritySet=new Set();
  if(isEnemy){
    // allyTarget 強制指定 → 前衛（lane==='front' or hate）→ 全生存敵
    const forced=liveUnits.filter(x=>x.u.allyTarget);
    if(forced.length){
      forced.forEach(x=>prioritySet.add(x.i));
    } else {
      const front=liveUnits.filter(x=>(x.u.lane==='front'||(x.u.hate&&x.u.hateTurns>0))&&!x.u.stealth);
      (front.length?front:liveUnits).forEach(x=>prioritySet.add(x.i));
    }
  } else {
    // hate（前衛・タウント）→ 全生存味方（コアの coreSelectAttackTarget と同じロジック）
    const hated=liveUnits.filter(x=>x.u.hate&&x.u.hateTurns>0&&!x.u.stealth);
    (hated.length?hated:liveUnits.filter(x=>!x.u.stealth)).forEach(x=>prioritySet.add(x.i));
  }
  // HPが0になっても、死亡演出が終わるまでは盤面の枠を確保しておく。
  // ここで即座に詰めると、まだ出ていないダメージ数値やVFXが移動前の位置
  // （＝何もない場所）へ出てしまう。
  const _onBoard=x=>!!x.u&&!_stealAwaitingMove(x.u)
    &&(_visualHp(x.u)>0||(_keepDying&&x.u.id!=null&&!x.u._deathFxReady&&dyingIds.has(String(x.u.id))));
  const _isRearUnit=x=>_onBoard(x)&&(x.u.lane||'front')==='rear';
  const _rearIndexes=units.map((u,i)=>({u,i})).filter(x=>_onBoard(x)&&!x.u._corePendingSummon&&!x.u._isObject&&_isRearUnit(x)).map(x=>x.i);
  const _frontIndexes=units.map((u,i)=>({u,i})).filter(x=>_onBoard(x)&&!x.u._corePendingSummon&&!x.u._isObject&&!_isRearUnit(x)).map(x=>x.i);
  const renderIndexes=isEnemy
    ?Array.from({length:MAX_ENEMIES||10},(_,idx)=>idx)
    :Array.from({length:MAX_ALLIES||10},(_,idx)=>idx);
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  el.style.setProperty('grid-template-columns',`repeat(${frontSlots},var(--unit-card-w))`,'important');
  el.style.setProperty('justify-content','center','important');
  const {_unitX,_rearLeft,_frontLeft}=_layoutBattleFieldRows(el,units,isEnemy,previousLefts,_frontIndexes,_rearIndexes,frontSlots);
  for(const i of renderIndexes){
    const rawU=units[i];
    // コアは後続効果の対象にできるよう召喚体を生成直後に配列へ入れるが、
    // `_flushCorePveHitEvents()`が召喚イベントを再生するまでは未配置状態である。
    // ここを描画すると、配列末尾の空き枠や左端へ一瞬表示され、実際の召喚順・
    // 攻撃順と画面がずれる。正式配置イベントでフラグが外れるまで描画しない。
    // 未表示フラグが立つ召喚体は描画しない。なぜ画面から消えたのかを
    // 後から追えるよう、生存している体を飛ばした時だけ記録を残す。
    if(rawU&&rawU._corePendingSummon&&rawU.hp>0&&typeof _recordBattleTrace==='function'){
      _recordBattleTrace('render_skip_pending',{unitId:rawU.id,name:rawU.name,side:isEnemy?'p2':'p1',index:i});
    }
    const u=rawU&&(rawU._corePendingSummon||_stealAwaitingMove(rawU))?null:rawU;
    // イベント再生中にHPが0になった体は、死亡演出を行うまでカードを残す。
    // 先に空スロットへ変えてしまうと、まだ出ていないダメージ数値・個別VFXが
    // 空きスロットの位置（7枠等間隔の左端寄り）へ出てしまう。
    // HP0の体は、コアの死亡イベントが消失演出を開始するまで盤面へ残す。
    const _pendingDeath=!!(u&&_visualHp(u)<=0&&u.id!=null&&!u._deathFxReady
      &&dyingIds.has(String(u.id))&&_keepDying);
    const _alive=!!u&&(_visualHp(u)>0||_pendingDeath);
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    slot.dataset.unitIdx=i;
    // 空スロットにIDを残すと、数値やモーションが「カードのない枠」に吸い寄せられる。
    if(_alive&&u.id!=null) slot.dataset.unitId=String(u.id);
    slot.style.setProperty('width','var(--unit-card-w)','important');
    slot.style.setProperty('min-width','var(--unit-card-w)','important');
    slot.style.setProperty('max-width','var(--unit-card-w)','important');
    slot.style.setProperty('height','var(--unit-card-h)','important');
    slot.style.setProperty('min-height','var(--unit-card-h)','important');
    slot.style.setProperty('max-height','var(--unit-card-h)','important');
    slot.style.setProperty('aspect-ratio','450 / 605','important');
    slot.style.setProperty('flex','0 0 var(--unit-card-w)','important');
    slot.style.setProperty('pointer-events','auto','important');
    // 敵スロットのレーン：生存敵はu.lane、死亡/空スロットはmoveMaskLanesで補完
    const _slotLane=isEnemy?(_alive?(u.lane||(i>=frontSlots?'rear':'front')):(G.moveMaskLanes?.[i]||(i>=frontSlots?'rear':'front'))):(_alive?(u.lane||'front'):(i>=frontSlots?'rear':'front'));
    if(!_alive){
      if(u&&typeof battleFxStopUnitStates==='function'&&!presentKeepsOnBoard(u)) battleFxStopUnitStates(u);
      // 消える直前のカードを焼き落とす。実スロットは従来どおり即座に空にするため、
      // 盤面の詰め直しや当たり判定には影響しない。_deathFxDoneで一度だけ発火させる。
      // イベント再生中は焼き落とさない。ここで消すと、まだ出ていないダメージ数値や
      // 個別VFXが「カードのない空きスロット」へ出てしまう。死亡演出は再生の最後に
      // まとめて行う（battle.js の death ループ）。
      const _flushing=_keepDying&&!(u&&u._deathFxReady);
      if(!_flushing&&u&&u.hp<=0&&!u._deathFxDone&&u.id!=null&&typeof playCardBurnAway==='function'){
        const _prevNode=previousSlots.get(String(u.id));
        const _prevRect=previousRects.get(String(u.id));
        if(_prevNode&&_prevRect&&_prevRect.width>0){
          u._deathFxDone=true;
          // 消え方の分岐は _playUnitDeathCardFx が唯一の実装。
          _playUnitDeathCardFx(u,_prevNode,_prevRect);
        }
      }
      slot.classList.add('empty','dead-empty');
      slot.innerHTML='';
      slot.style.gridRow=_slotLane==='rear'?'1':'2';
      slot.style.gridColumn=String((i%frontSlots)+1);
      // #f-enemy/#f-ally は display:block で運用されておりgrid-row/columnは効かないため、
      // 空き/死亡スロットも生存ユニットと同様に絶対座標で位置指定する
      // （さもないと全ての空きスロットが同じ位置に重なり、特定スロットのホバー判定を塞いでしまう）
      slot.style.left=_unitX(frontSlots,i%frontSlots);
      const _emptyRearTop=isEnemy?'0':'calc(var(--unit-card-h) + var(--unit-field-gap))';
      const _emptyFrontTop=isEnemy?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0';
      slot.style.top=_slotLane==='rear'?_emptyRearTop:_emptyFrontTop;
      slot.style.setProperty('position','absolute','important');
      slot.style.setProperty('transform','none','important');
      // 生存数が7体未満だと生存ユニットは中央寄せで再配置されるため、空きスロットの位置と
      // 重なることがある。重なった場合でも必ず生存ユニット側のhit-layerが優先されるよう、
      // 空きスロットは常に低いz-indexにしておく
      slot.style.setProperty('z-index','1','important');
    }
    // 再生中に倒れた体もカードとして描く（_alive）。ここをhp>0にすると、
    // 数値やVFXが出る前にカードが消え、位置指定のない空枠へ吸い寄せられる。
    if(_alive){
      const _row=_slotLane==='rear'?1:2;
      slot.style.gridRow=String(_row);
      slot.style.gridColumn='1';
      slot.style.left=(_slotLane==='rear'?_rearLeft.get(i):_frontLeft.get(i))||`calc((var(--unit-card-w) + var(--unit-field-gap)) * ${(i%frontSlots)})`;
      // 前衛は敵に近い側（画面中央寄り）、後衛は画面外側（味方側は下端、敵側は上端）に表示する。
      // 敵は画面上部・味方は画面下部に配置されるため、両者の前衛同士が画面中央で向き合う形になる。
      const _rearTop=isEnemy?'0':'calc(var(--unit-card-h) + var(--unit-field-gap))';
      const _frontTop=isEnemy?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0';
      slot.style.top=_slotLane==='rear'?_rearTop:_frontTop;
      slot.style.setProperty('position','absolute','important');
      // 人数変化のFLIP中に別のrenderAll()が走っても、再生成したslotで
      // transform:noneへ戻すと移動が瞬間移動に見える。描画間で保持した
      // 残り移動量を引き継ぎ、同じ時刻から終点へ遷移させる。
      const compactMove=G._battleCompactMoves&&G._battleCompactMoves.get(String(u.id));
      // 新しいFLIPの初回描画では、前回移動のtransformを先に適用すると
      // getBoundingClientRect()が「移動後の矩形」になり、旧矩形との差分を
      // 正しく測れない。新しいFLIP側が旧DOM矩形から移動元を再計算する。
      if(compactMove&&!G._animateBattleCompact&&performance.now()-compactMove.start<compactMove.duration){
        const progress=Math.max(0,Math.min(1,(performance.now()-compactMove.start)/compactMove.duration));
        const rx=compactMove.dx*(1-progress), ry=compactMove.dy*(1-progress);
        const moveStart=compactMove.start;
        slot.style.setProperty('transition','none','important');
        slot.style.setProperty('transform',`translate(${rx}px,${ry}px)`,'important');
        requestAnimationFrame(()=>{
          // 連続召喚・死亡で同じユニットの新しいFLIPが始まった場合、
          // 古いrenderFieldのRAFが新しい移動をtranslate(0,0)へ戻さない。
          const currentMove=G._battleCompactMoves?.get(String(u.id));
          if(!slot.isConnected||!currentMove||currentMove.start!==moveStart) return;
          slot.style.setProperty('transition','transform 260ms ease','important');
          slot.style.setProperty('transform','translate(0,0)','important');
        });
      }else slot.style.setProperty('transform','none','important');
    }
    if(isEnemy&&_slotLane==='rear') slot.classList.add('is-rear');
    if(isEnemy&&_slotLane!=='rear') slot.classList.add('is-front');
    // 攻撃モーション中だけ実スロットを隠す。再描画・召喚・変身の境界で
    // _motionHidden が古い実体へ残ると、攻撃終了後もカードが消えたままになり、
    // 表示上の攻撃者とコア上の攻撃者がずれる。モーション深度がない stale flag は
    // ここで解除して、通常のカード表示へ戻す。
    // 深度カウンタだけに頼ると、モーションの入れ子・中断で数え違いが起きたとき
    // 「飛んでいる複製カード」と「元位置の実カード」が同時に見える（＝カードが2枚に見える）。
    // 実際に複製が生きているかをDOMで直接確かめ、生きている間は必ず実スロットを隠す。
    const _hasMotionClone=!!(u&&u.id!=null
      &&document.querySelector(`.attack-motion-clone[data-unit-id="${String(u.id).replace(/["\\]/g,'\\$&')}"]`));
    // 判断の第一根拠はDOM上に複製が生きているかどうか。深度カウンタや
    // _motionHidden フラグは、例外・入れ子・再描画の境界でずれることがあり、
    // ずれた瞬間に「飛んでいる複製」と「元位置の実カード」が同時に見える
    // （＝戦闘が長引くほど起きやすくなる）。複製が生きている間は無条件で隠す。
    // **奪われる体は、演出が始まるまで描かない。**
    // 元の位置には beginUnitStealPresentation() が貼り付けた複製が残っている。
    if(u&&u._stealPendingPresent){
      slot.classList.add('motion-hidden'); slot.style.visibility='hidden';
    } else if(u&&_hasMotionClone){
      u._motionHidden=true;
      slot.classList.add('motion-hidden'); slot.style.visibility='hidden';
    } else if(u&&u._motionHidden&&Number(G&&G._battleMotionDepth||0)>0){
      slot.classList.add('motion-hidden'); slot.style.visibility='hidden';
    } else if(u&&u._motionHidden){
      u._motionHidden=false;
    }
    // 発光中に作り直されたスロットへ光を付け直す（規則は playEffectFlash 側）。
    if(u) _reapplyEffectFlash(slot,u);
    // **奪って味方になった体は「自軍のキャラクター」ではない。**
    // 判定は assets.js の applyUnitVisual() と揃えること（`_useEnemyVisualFrame` を見る）。
    // 揃えないと、下の「自軍キャラは characterFrame」でボス枠へ上書きされ、
    // 奪った瞬間に敵の枠が本来のものからボス枠へ変わる。
    const _copyFrame=u&&u._copyFrame||null;
    const _isPlayerHero=!!(u&&!isEnemy&&(!u._panelSummoned||_copyFrame&&_copyFrame.hero)&&!u._useEnemyVisualFrame&&!(_copyFrame&&_copyFrame.enemyVisual));
    const _hasGuardPanel=u&&!_isPlayerHero&&((isEnemy||u._panelSummoned)&&u.guardian);
    if(u&&_visualHp(u)>0&&_hasGuardPanel) slot.classList.add('is-defender','uses-hate-frame');
    if(u&&_visualHp(u)>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('is-defender');
    if(u&&_visualHp(u)>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('uses-hate-frame');
    if(_isPlayerHero) slot.classList.remove('is-defender','uses-hate-frame');
    // 敵も、再生中に倒れた体は死亡演出まで中身を描く（味方と同じ扱い）。
    if(u&&(!isEnemy||_alive)){
      slot.classList.add('unit-card');
      if(u.name==='石像') slot.classList.add('no-unit-shadow');
      // 復活演出の準備中はカードを出さない（present_events.js が印を付ける）。
      if(u._reviveHidden) slot.classList.add('revive-hidden');
      // **戦闘中もカード説明の見出しをレアリティ色にする。**
      // ホバー説明（#kw-tooltip）の色は、ホバーした要素が持つ `rarity-N` クラスから
      // 決まる（この上の _initKwTooltip）。編成・報酬のカードには付いているが、
      // 戦闘のスロットには付いていなかったため、戦闘中だけ色が白のままだった。
      // **戦闘中のユニットは rarity を持たない**（編成カードから作る時に引き継がれない）
      // ので、名前でカード定義を引いて補う。
      const _rarity=_battleUnitRarity(u);
      if(_rarity>=1&&_rarity<=6) slot.classList.add(`rarity-${_rarity}`);
      // `_sealShownPending` は「コアは解放済みだが、演出がまだそこへ来ていない」印。
      // これを見ないと、味方が倒れる演出より先に封印キャラが明るくなる。
      if(u._sealed||u._sealShownPending){
        slot.classList.add('sealed-unit');
        slot.style.filter='';
      } else {
        slot.style.filter='';
      }
      // 死亡演出を始めるまでは暗くしない。数値を出し切るための短い間だけ枠を
      // 残しているので、ここで暗い見た目にすると「死体が場に残っている」ように見える。
      if(_visualHp(u)<=0) slot.classList.add('inert');
      if(_visualHp(u)<=0&&!_pendingDeath) slot.classList.add('dead-unit');
      if(!isEnemy&&G._selectedBoardUnitIdx===i) slot.classList.add('selected');
      if(typeof applyUnitVisual==='function') applyUnitVisual(slot,typeof battleFxShownForm==='function'?battleFxShownForm(u):u);
      if(_isPlayerHero){
        slot.classList.remove('is-defender','uses-hate-frame');
        if(typeof assetUrl==='function'&&typeof Assets!=='undefined'&&Assets.cards?.characterFrame){
          const _heroFrameUrl=assetUrl(Assets.cards.characterFrame);
          slot.style.setProperty('--unit-frame',_heroFrameUrl);
          // 枠画像を差し替えたので、角R測定用のキーも合わせておく（applyUnitVisualの結果を上書きするため）
          if(typeof applyFrameRadiusKey==='function') applyFrameRadiusKey(slot,_heroFrameUrl);
        }
      }
      if(isEnemy&&typeof getSheetRaceByName==='function'){
        const _sheetRace=getSheetRaceByName(u.name);
        if(_sheetRace) u.race=_sheetRace;
      }
      _renderBattleUnitContent(slot,u,i,isEnemy);
      _wireBattleUnitControls(slot,u,i,isEnemy);
    } else {
      slot.classList.add('empty');
      if(!isEnemy){
        slot.addEventListener('dragover',e=>{
          if(!(G.phase==='reward'||G.phase==='player')) return;
          if(window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(!(G.phase==='reward'||G.phase==='player')) return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          if(typeof _libraryTutorialAllowsMove==='function'&&!_libraryTutorialAllowsMove(G.allies[src],i)) { window._allySlotDragSrc=null; return; }
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            const frontSlots=ENEMY_FRONT_SLOTS||7;
            if((src>=frontSlots)!==(i>=frontSlots)){
              window._allySlotDragSrc=null;
              renderAll();
              return;
            }
            G.allies[i]=G.allies[src];
            G.allies[src]=null;
            if(G.allies[i]) G.allies[i].lane=i>=frontSlots?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
      }
    }
    el.appendChild(slot);
    if(u&&slot.dataset.unitId&&typeof battleFxSyncUnit==='function') battleFxSyncUnit(u,isEnemy?'enemy':'ally',slot);
    if(typeof SaveProfile!=='undefined') SaveProfile.observe(slot,units.find(x=>x&&String(x.id)===String(slot.dataset.unitId)));
    if(u&&u.hp>0&&typeof _recordBattleTrace==='function'){
      // renderAll()は演出中にも複数回呼ばれるため、同じユニットのDOM追加を毎回
      // 記録すると召喚・FLIP・マナの時系列がログから押し出される。
      // ユニットIDごとに初回のDOM追加だけを記録し、召喚体が実際にDOMへ入った時刻を残す。
      const domKey=`${isEnemy?'p2':'p1'}:${u.id}`;
      const domSeen=G._battleTraceDomIds||(G._battleTraceDomIds=new Set());
      if(!domSeen.has(domKey)){
        domSeen.add(domKey);
        _recordBattleTrace('unit_dom_append',{unitId:u.id,side:isEnemy?'p2':'p1'});
      }
    }
  }
  _animateBattleFieldCompact(el,id,previousRects);
}

function renderControls(){
  const pp=document.getElementById('btn-pass');
  const dbg=document.getElementById('btn-debug-kill');
  const testBtn=document.getElementById('btn-test-battle');
  const dbgOver=document.getElementById('btn-debug-gameover');
  const dbgQuest=document.getElementById('btn-debug-quest');
  // 編成画面の補助ボタンは、闘技場中・勝利演出中を含めて同じ条件で出す。
  const dbgExtra=['btn-debug-map'].map(id=>document.getElementById(id)).filter(Boolean);
  const setDbgExtra=v=>dbgExtra.forEach(el=>{
    if(v==='none') el.style.setProperty('display','none','important');
    else el.style.removeProperty('display');
  });
  const setDbgQuest=v=>{
    if(!dbgQuest) return;
    if(v) dbgQuest.style.removeProperty('display');
    else dbgQuest.style.setProperty('display','none','important');
  };
  const setDbgOver=v=>{
    if(!dbgOver) return;
    if(v) dbgOver.style.removeProperty('display');
    else dbgOver.style.setProperty('display','none','important');
  };
  const debugTestBattle=!!(G._debugMode&&G._testBattleMode&&!G._libraryTestBattleMode&&!debugButtonsSuppressed());
  // デバッグ撃破ボタンは報酬バー内にあるため、試験戦闘中だけ親を表示して
  // 実際のクリック領域を確保する。通常モード・通常戦闘では親も従来どおり隠す。
  const dbgParent=dbg&&dbg.parentElement;
  if(dbgParent){
    if(debugTestBattle) dbgParent.style.setProperty('display','block','important');
    else dbgParent.style.removeProperty('display');
  }
  if(G.phase==='player'){
    if(dbg) dbg.style.display=G._debugMode&&!debugButtonsSuppressed()?'':'none';
    if(testBtn) testBtn.style.display='none';
    setDbgOver(false);
    setDbgQuest(false);
    setDbgExtra('none');
  } else if(G.phase==='reward'){
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
    // 闘技場の継戦確認の間（勝利後に phase が reward になる）は、デバッグ用のボタンを出さない。
    const _dbgShow=G._debugMode&&!G._onlineMode&&!debugButtonsSuppressed();
    setDbgOver(_dbgShow);
    setDbgQuest(_dbgShow);
    if(testBtn) testBtn.style.display=_dbgShow?'':'none';
    setDbgExtra(_dbgShow?'':'none');
    return;
  } else {
    // デバッグ試験戦闘では自動進行中（enemyフェイズ）でも一括撃破を使えるようにする。
    // 人数減少後のFLIPを画面遷移前に実測するための検証専用入口で、通常戦闘には出さない。
    if(dbg) dbg.style.display=G._debugMode&&G._testBattleMode&&!debugButtonsSuppressed()?'':'none';
    setDbgOver(false);
    setDbgQuest(false);
    if(testBtn) testBtn.style.display='none';
    setDbgExtra('none');
  }
  // 戦闘開始ボタンは廃止した。試験戦闘中のみ「戦闘終了」として常時表示する。
  // ただし図書館の試験戦闘は勝敗が付くまで行うため、中断ボタンは出さない。
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    pp.textContent='戦闘終了';
    pp.disabled=false;
    pp.style.display='';
  } else {
    pp.style.display='none';
  }
}
