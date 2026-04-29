// ═══════════════════════════════════════
// assets.js — 仮アセット台帳
// すべての画像参照はこのファイルに集約する。
// file:// 起動を維持するため、プロジェクトルート相対パスを使う。
// ═══════════════════════════════════════

const Assets = {
  cards: {
    default: 'assets/temp/cards/card_placeholder.svg',
    character: 'assets/temp/cards/card_character.svg',
    ring: 'assets/temp/cards/card_ring.svg',
    wand: 'assets/temp/cards/card_wand.svg',
    consumable: 'assets/temp/cards/card_item.svg',
  },
  backgrounds: {
    title: 'assets/temp/backgrounds/title_road.svg',
    stage1: 'assets/temp/backgrounds/grassland.svg',
    stage2: 'assets/temp/backgrounds/forest.svg',
    stage3: 'assets/temp/backgrounds/valley.svg',
    stage4: 'assets/temp/backgrounds/capital.svg',
    shop: 'assets/temp/backgrounds/tent.svg',
  },
  vfx: {
    hit: 'assets/temp/vfx/hit.svg',
    glow: 'assets/temp/vfx/glow.svg',
  },
  ui: {
    frame: 'assets/temp/ui/card_frame.svg',
  },
};

function assetUrl(path){
  return `url("${path}")`;
}

function getStageBackgroundKey(floor){
  const f=Number(floor||1);
  if(f<=5) return 'stage1';
  if(f<=10) return 'stage2';
  if(f<=15) return 'stage3';
  return 'stage4';
}

function getCardAsset(card){
  if(!card) return Assets.cards.default;
  if(card._isChar||(!card.type&&!card.kind)) return Assets.cards.character;
  if(card.type==='wand') return Assets.cards.wand;
  if(card.type==='consumable') return Assets.cards.consumable;
  if(card.type==='ring'||card.kind==='summon'||card.kind==='passive') return Assets.cards.ring;
  return Assets.cards.default;
}

function setScreenAssetBackground(screenId, bgKey){
  const el=document.getElementById('scr-'+screenId);
  const path=Assets.backgrounds[bgKey];
  if(!el||!path) return;
  el.classList.add('asset-backed');
  el.style.setProperty('--screen-bg-image', assetUrl(path));
}

function applyScreenAssetBackground(screenId){
  if(screenId==='title'){ setScreenAssetBackground('title','title'); return; }
  if(screenId==='shop'){ setScreenAssetBackground('shop','shop'); return; }
  if(screenId==='battle'){
    const key=(typeof G!=='undefined'&&G&&G._isShop)?'shop':getStageBackgroundKey(typeof G!=='undefined'?G.floor:1);
    setScreenAssetBackground('battle',key);
  }
}

function setBattleStageBackground(){
  setScreenAssetBackground('battle',getStageBackgroundKey(typeof G!=='undefined'?G.floor:1));
}

function setBattleShopBackground(){
  setScreenAssetBackground('battle','shop');
}

function playVfxOnElement(type, el){
  if(!el||typeof G!=='undefined'&&G._isSimulating) return;
  const path=Assets.vfx[type];
  if(!path) return;
  const fx=document.createElement('div');
  fx.className=`vfx vfx-${type}`;
  fx.style.setProperty('--vfx-image', assetUrl(path));
  el.appendChild(fx);
  fx.addEventListener('animationend',()=>fx.remove(),{once:true});
}

function playHitVfx(side, idx){
  if(typeof G!=='undefined'&&G._isSimulating) return;
  const draw=()=>{
    const id=side==='enemy'?'f-enemy':'f-ally';
    const slot=document.getElementById(id)?.querySelectorAll('.slot')?.[idx];
    playVfxOnElement('hit',slot);
  };
  requestAnimationFrame(()=>requestAnimationFrame(draw));
}

function playCardUseVfx(idx){
  const el=document.querySelector(`[data-card-ctx="spell-battle"][data-card-idx="${idx}"]`);
  if(el){
    el.classList.add('card-use-glow');
    playVfxOnElement('glow',el);
    setTimeout(()=>el.classList.remove('card-use-glow'),420);
  }
}

window.Assets=Assets;
