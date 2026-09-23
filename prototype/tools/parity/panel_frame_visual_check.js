'use strict';
// 指輪枠の消失は実際の:pointer hoverで、9スライスは描画画素でも確認する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch,sleep}=require('./headless');
const root=path.resolve(__dirname,'../..');
const url=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const output=process.env.VB_FRAME_SHOTS||'/tmp/vesselbound-panels';
// 初回移行時は旧SVGの退避先を指定して画素比較できる。通常検査は分割素材だけで動く。
const sourceDir=process.env.VB_PANEL_SOURCE_DIR;

(async()=>{
  const b=await launch({width:1920,height:1200});
  fs.mkdirSync(output,{recursive:true});
  try{
    await b.goto(url,2200);
    await b.waitFor('typeof RING_POOL!=="undefined"&&RING_POOL.length>0',20000);
    await b.eval('startGame(true);');
    await b.waitFor(`!G._villageIntroPlaying&&document.getElementById('scr-village').classList.contains('active')`,15000);
    await b.eval(`
      await _onVillageFacility({key:'ringExchange',name:'祭壇'});
      await new Promise(r=>setTimeout(r,350));
      G._ringOffer=RING_POOL.slice(0,3).map(x=>clone(x));
      renderHandEditor();renderRewCards();
    `);
    const inspectRing=`
      const el=document.querySelector('.ring-offer-card');const s=getComputedStyle(el,'::before');
      const r=el.getBoundingClientRect();return {display:s.display,content:s.content,image:s.backgroundImage,
        border:s.borderTopWidth,hover:el.matches(':hover'),x:r.x+r.width/2,y:r.y+r.height/2};`;
    const normal=await b.eval(inspectRing);
    assert(await b.eval(`return G._isRingExchange&&!G._ringOfferUnlocked&&
      document.querySelector('.ring-offer-card').classList.contains('ring-offer-locked');`),'未解放の祭壇ではない');
    await b.screenshot(path.join(output,'altar-normal.png'));
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:normal.x,y:normal.y});
    await sleep(350);
    const hover=await b.eval(inspectRing);
    assert(hover.hover,'実際のホバーが成立していない');
    assert.equal(hover.display,'block','指輪枠がホバーで消える');
    assert.notEqual(hover.content,'none');
    assert.equal(hover.image,normal.image);
    assert.equal(hover.border,'0px','通常カードの枠線が指輪へ混入している');
    await b.screenshot(path.join(output,'altar-hover.png'));
    console.log('祭壇の指輪',JSON.stringify({normal,hover}));

    const panelMetrics=await b.eval(`
      const ids=['options-panel','collection-panel-bg','reward-offer-section'];
      return ids.map(id=>{const el=document.getElementById(id),s=getComputedStyle(el);return {id,
        w:s.width,h:s.height,source:s.borderImageSource,slice:s.borderImageSlice,
        borderWidth:s.borderTopWidth,imageWidth:s.borderImageWidth,background:s.backgroundImage};});`);
    for(const p of panelMetrics){
      assert(p.source.includes('main_right_frame.svg'),p.id+'の枠素材');
      assert.equal(p.slice,'85');assert.equal(p.imageWidth,'85px');assert.equal(p.borderWidth,'0px');
      assert(p.background.includes('main_right_decoration.svg'));
    }
    console.log('パネル',JSON.stringify(panelMetrics));
    const leftMetrics=await b.eval(`
      return ['.reward-prod-item','.reward-prod-ring','.reward-prod-quest','.reward-prod-journey',
        '#fatal-error-frame','#options-confirm-box','.run-resume-journey'].map(selector=>{
        const el=document.querySelector(selector),s=getComputedStyle(el,'::before');
        return {selector,source:s.borderImageSource,slice:s.borderImageSlice,width:s.borderImageWidth,
          background:s.backgroundImage,color:s.backgroundColor,after:getComputedStyle(el,'::after').content};});`);
    for(const p of leftMetrics){
      assert(p.source.includes('main_left_frame.svg'),p.selector+'の左枠素材');
      assert.equal(p.slice,'85');assert.equal(p.width,'85px');assert.equal(p.color,'rgba(0, 0, 0, 0.5)');
      assert(p.background.includes('main_left_decoration.svg'));assert.equal(p.after,'none');
    }
    console.log('左枠',JSON.stringify(leftMetrics));
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});
    await b.eval('_optionOpen();');await sleep(350);
    await b.screenshot(path.join(output,'options.png'));
    await b.eval(`_optionClose(true);document.body.className='';
      document.getElementById('scr-battle').style.removeProperty('display');
      _returnToTitleMenu();
      openCollection();`);
    await sleep(650);
    const collectionVisible=await b.eval(`
      const panel=document.getElementById('collection-panel-bg');
      for(let el=panel;el;el=el.parentElement){const s=getComputedStyle(el);
        if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)<.99)return false;}
      return panel.getBoundingClientRect().width>0;`);
    assert(collectionVisible,'コレクションの親画面が非表示のまま');
    await b.screenshot(path.join(output,'collection.png'));
    const tips=await b.eval(`
      closeCollection();const ids=['kw-tooltip','map-power-tooltip','keyword-tooltip'];
      const result=[];
      for(const [index,id] of ids.entries()){
        const el=document.getElementById(id);el.className='';
        el.innerHTML='<div class="preview-title">'+['カード説明','魔導板の力','キーワード説明'][index]+'</div>説明枠の背景色と四隅を確認するための本文。';
        el.style.display='block';el.style.left=(30+index*480)+'px';el.style.top='350px';
        const s=getComputedStyle(el),frame=getComputedStyle(el,'::before');
        result.push({id,color:s.backgroundColor,source:frame.borderImageSource,slice:frame.borderImageSlice,
          image:frame.backgroundImage,width:frame.borderImageWidth});
      }
      const tip=document.getElementById('kw-tooltip');
      for(const cls of ['character-tooltip','journey-enemy-tooltip','map-tooltip']){
        tip.className=cls;result.push({id:cls,color:getComputedStyle(tip).backgroundColor});
      }
      tip.className='';return result;`);
    for(const tip of tips.slice(0,3)){
      assert(tip.source.includes('main_right_frame.svg'));assert.equal(tip.slice,'85');
      assert.equal(tip.image,'none','説明枠にdecoration_barが出ている');
    }
    assert.equal(tips[0].color,'rgba(47, 26, 11, 0.95)');
    assert.equal(tips[1].color,'rgba(17, 28, 42, 0.95)');
    assert.equal(tips[2].color,'rgba(35, 19, 10, 0.95)');
    assert.equal(tips[3].color,'rgba(7, 3, 1, 0.95)');
    assert.equal(tips[4].color,'rgba(7, 3, 1, 0.95)');
    assert.equal(tips[5].color,'rgba(17, 28, 42, 0.95)');
    console.log('説明枠',JSON.stringify(tips));
    await sleep(550);await b.screenshot(path.join(output,'tooltips.png'));
    const simpleTip=await b.eval(`const el=document.getElementById('kw-tooltip');el.className='no-title-rule';
      el.innerHTML='旅の進捗';return getComputedStyle(el,'::before').borderImageSource;`);
    assert(simpleTip.includes('/info_box.svg'),'簡素な説明枠の改名が未反映');
    await b.screenshot(path.join(output,'info-box.png'));
    await b.eval(`for(const id of ['kw-tooltip','map-power-tooltip','keyword-tooltip'])document.getElementById(id).style.display='none';
      _optionOpen();_optionConfirm('profile');`);
    assert(await b.eval(`return document.getElementById('options-confirm-layer').classList.contains('is-open');`));
    await b.screenshot(path.join(output,'options-confirm.png'));
    await b.eval(`_optionClose(true);showFatalError('VISUAL-CHECK');`);
    await b.screenshot(path.join(output,'fatal-error.png'));
    await b.eval(`document.body.classList.remove('fatal-error-active');
      document.getElementById('fatal-error-overlay').setAttribute('aria-hidden','true');
      document.getElementById('run-resume-journey-ui').innerHTML=document.getElementById('journey-progress-ui').innerHTML;
      document.body.classList.add('run-resume-active');`);
    await b.screenshot(path.join(output,'run-resume.png'));

    // 独立した1:1描画で、SVG原寸と異なる縦横寸法の四隅を画素比較する。
    for(const side of ['left','right']){
    const frame=fs.readFileSync(path.join(root,`assets/ui/main_${side}_frame.svg`),'utf8');
    const source=sourceDir?fs.readFileSync(path.join(sourceDir,`main_${side}.svg`),'utf8'):frame;
    const data=s=>'data:image/svg+xml;base64,'+Buffer.from(s).toString('base64');
    await b.goto('about:blank',50);
    await b.eval(`document.body.style.cssText='margin:0;background:#000';
      const el=document.createElement('div');el.id='probe';document.body.appendChild(el);
      el.style.cssText='width:1020px;height:455px;background:#000';
      el.style.backgroundImage='url("'+${JSON.stringify(data(source))}+'")';
      el.style.backgroundSize='1020px 455px';`);
    await sleep(250);
    const frameShots=async(w,h)=>{
      const shots=[];
      // 四隅と、上下左右の直線の断面。長さ方向に伸びても太さは変えない。
      for(const [x,y,width,height] of [[0,0,85,85],[w-85,0,85,85],[0,h-85,85,85],[w-85,h-85,85,85],
        [Math.floor(w/2),0,1,8],[Math.floor(w/2),h-8,1,8],
        [0,Math.floor(h/2),8,1],[w-8,Math.floor(h/2),8,1]]){
        const shot=await b.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
          clip:{x,y,width,height,scale:1}});shots.push(shot.data);
      }
      return shots;
    };
    const original=await frameShots(1020,455);
    // 最小高さ170では上下の85px角が接する。接点は元SVGの下角の先頭（y=370）に対応し、
    // 元SVGの縦辺中央（y=227）ではない。異なる場所のグラデーションを線幅差と誤判定しない。
    const minimumHeightEdges=[];
    for(const x of [0,1012]){
      const shot=await b.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
        clip:{x,y:370,width:8,height:1,scale:1}});minimumHeightEdges.push(shot.data);
    }
    const sizes=side==='left'?[[1020,289],[1020,372],[1020,455],[1360,760]]:
      [[1590,576],[2010,1500],[2189,2020],[800,170],[800,480]];
    for(const [w,h] of sizes){
      await b.eval(`const el=document.getElementById('probe');
        el.style.width='${w}px';el.style.height='${h}px';el.style.backgroundImage='none';
        el.style.border='0 solid transparent';el.style.borderImageSource='url("'+${JSON.stringify(data(frame))}+'")';
        el.style.borderImageSlice='85';el.style.borderImageWidth='85px';el.style.borderImageRepeat='stretch';`);
      await sleep(120);
      const actual=await frameShots(w,h);
      const expected=h===170?[...original.slice(0,6),...minimumHeightEdges]:original;
      const differences=await b.eval(`
        async function pixels(base64){const im=new Image();im.src='data:image/png;base64,'+base64;await im.decode();
          const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;}
        const original=${JSON.stringify(expected)},actual=${JSON.stringify(actual)},result=[];
        for(let k=0;k<original.length;k++){const a=await pixels(original[k]),b=await pixels(actual[k]);let changed=0,total=0,max=0,supportMismatch=0;
          for(let i=0;i<a.length;i+=4){const d=Math.max(...[0,1,2].map(j=>Math.abs(a[i+j]-b[i+j])));if(d>2)changed++;total+=d;max=Math.max(max,d);
            if((Math.max(a[i],a[i+1],a[i+2])>8)!==(Math.max(b[i],b[i+1],b[i+2])>8))supportMismatch++;}
          result.push({changed,mean:total/(a.length/4),max,supportMismatch});}
        return result;`);
      console.log(side+' 四隅・線幅の画素比較',w+'x'+h,JSON.stringify(differences));
      assert(differences.slice(0,4).every(d=>d.mean<1),w+'x'+h+'で原寸角が変化している');
      // 高さ170では上下の85px角が接し、縦辺の中央区画は0pxになる。
      // そこでの色は元の中央部ではなく角の端のグラデーションになるが、線幅は同じ。
      assert(differences.slice(4).every(d=>d.supportMismatch===0),w+'x'+h+'で線幅が変化している');
    }
    }
    // file://でも外部SVGが読み込めることを実際の本編で確認。
    await b.goto(pathToFileURL(path.join(root,'index.html')).href,1800);
    const local=await b.eval(`return await Promise.all(['main_left_frame','main_left_decoration','main_right_frame','main_right_decoration','info_box'].map(async name=>{
      const im=new Image();im.src='assets/ui/'+name+'.svg';await im.decode();return {name,protocol:location.protocol,width:im.naturalWidth,height:im.naturalHeight};}));`);
    for(const im of local.slice(0,4)){assert.equal(im.width,1020);assert.equal(im.height,455);}
    // info_boxはviewBoxのみ（500×200）で、Chromeの自然寸法は300×120になる。
    assert(local[4].width>0);assert.equal(local[4].width/local[4].height,2.5);
    await b.waitFor('typeof _optionOpen==="function"&&typeof RING_POOL!=="undefined"&&RING_POOL.length>0',20000);
    await b.eval('_returnToTitleMenu();_optionOpen();');await sleep(500);
    assert(await b.eval(`return document.getElementById('options-layer').classList.contains('is-open')&&
      getComputedStyle(document.getElementById('options-panel')).borderImageSource.includes('main_right_frame.svg');`));
    await b.screenshot(path.join(output,'file-options.png'));
    await b.eval(`_optionConfirm('profile');`);
    await b.screenshot(path.join(output,'file-options-confirm.png'));
    console.log('file://',JSON.stringify(local));
    console.log('保存先',output);
  }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
