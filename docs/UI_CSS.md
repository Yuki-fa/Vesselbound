# UI・CSS

CSS整理、枠線、ドラッグ、画面状態ごとの見た目に関する詳細記録を置く。UI・レイアウト・発光・枠・ドラッグ表示を変更するときに読むこと。

### 8-2. CSS（`index.html` 13,900行・`!important` 5,481箇所）

**症状**：同じ要素の同じプロパティに、同じ強さのルールが複数ある。
後勝ちで決まるため、詳細度を上げるハックが必要になりやすい。

**やること（この順で）**：

1. 同じセレクタ・同じプロパティの重複ルールを1つにまとめる。
   整理済みの実例：`.reward-prod-quest .reward-prod-quest-body` と
   `.item-use-picking` の競合。今後も同じ方法で小さく進める。
2. まとめ終わってから、詳細度稼ぎの二重クラスを1つに戻す。
3. **実効値が変わっていないことを実機で確認する。**
   `getComputedStyle()` で整理前後の値を比べること（見た目の目視だけでは足りない）。

**まとめては**いけないもの：`:is(#reward-move-btns,#reward-offer-section)` のように
**意図して対象を広げた**セレクタ（報酬枠の中に「元に戻す」と同じボタンを置くため）。

**やってはいけない順序（実際に壊した例）**：重複を残したまま**二重書きだけ先に外す**と、
後方の同じ強さのルールに後勝ちで負けて機能が壊れる。
アイテム使用中の `#reward-offer-section{z-index:9001}` と `#battle-options-btn{z-index:9001}` を
単一クラスへ戻したところ、後方の
`html body.reward-screen-active #reward-offer-section{z-index:10!important}` と
`#reward-production-ui` 等をまとめた `z-index:2!important` に負け、
**報酬枠が暗転の下へ沈み、キャンセルも押せなくなった。**
`.item-use-picking.item-use-picking` にはその旨をCSSのコメントで書いてある。
**コメントごと消さないこと。**

**もう一つの落とし穴**：広い `filter:none!important`（`#hand-pane *` など）は、
より詳細度の低い状態クラス（`.item-target-disabled` の暗転）を巻き添えで消す。
`*:not(.item-target-disabled)` のように除外するか、後ろで打ち消し直すこと。
**「クラスは付いているのに見た目が変わらない」時はこれを疑う。**

## 8-6. codexへの修正指示：カード枠SVG化で出た4件の枠線不具合

**2026-09-11。原因はすべて特定済み（実測値つき）。以下のとおり直すこと。**
**`!important` を積み増して押さえ込まないこと。** 原因は下の「共通の根っこ」にある。

### 共通の根っこ：線の出どころが2つあり、片方だけ縮尺が掛からない

1. **SVGの中に線がある。** `summon_frameN.svg` / `enemy_frame.svg` / `boss_frame.svg` /
   `enchantment.svg` は `viewBox="0 0 1300 1973.1"` に `stroke-width:20px`（viewBox単位）を持つ。
   背景を `100% 100%` で描くので、**線の太さは要素の描画サイズに比例する**
   （260px幅なら 20×260/1300 ＝ 4px）。
2. **CSSでも線を引いている。** `border:2px solid #c49a6c`／特殊マスは `5px`。
   こちらは**絶対px**なので描画サイズに比例しない。

そのうえで、実カードは `.screen{transform:scale(var(--game-scale))}` の**中**にあり、
**攻撃モーションの複製（`.attack-motion-clone`）とドラッグゴースト（`.drag-ghost`）は
`document.body` 直下＝縮尺の外**にある。同じ `5px` でも画面上の太さが変わる。

**実測（`--game-scale:0.5` にして同じDOMを比較）**

| | CSSの指定 | 画面上の実寸 |
| --- | --- | --- |
| 実カード（`.screen` の中） | 5px | **2.50px** |
| body直下の複製（同じDOM） | 5px | **5.00px** |

→ **ちょうど 1/game-scale 倍（この例で2倍）太くなる。** これが (1)(2) の正体。
利用者の窓で「2pxが5pxに見える」のは game-scale がおよそ 0.4 だから。

**前例がある。** `#kw-tooltip` は body 直下にあるため
`font-size:calc(22px * var(--game-scale))` と書いてある。枠線も同じ扱いにすること。
`_buildMotionCardClone()`（`js/engine/render.js`）も**フォントサイズだけは**
`fs = parseFloat(s.fontSize) * gameScale`（3052行あたり）で補正しており、
**border-width の補正だけが抜けている。**

### (1) 攻撃アニメーションで線が太くなる ／ (2) ドラッグで線が太くなる

**直し方（Aを推奨）**

- **A：複製を作るJSで、元の「画面上の太さ」をそのまま写す。**
  `_buildMotionCardClone()`（render.js）と `_createDragGhost()`（`js/engine/reward.js` 2426行〜）で、
  枠を描いている要素（`.unit-frame-layer` / `.character-frame-layer`、`::after` を使う型ならカード本体）へ
  `borderWidth = 元のcomputed borderWidth × _gameScale()` を important で書き込む。
  フォントサイズと同じ場所・同じやり方で揃う。
- **B：CSSで、body直下の複製だけ `calc(Npx * var(--game-scale))` にする。**
  `index.html` 14901行「枠線の最終状態固定」（`.attack-motion-clone` / `.dragging` / `.drag-ghost` を
  2px に固定しているブロック）を `border-width:calc(2px * var(--game-scale))` へ。特殊マスの5pxも同様。

**注意：`.dragging` は元のカード（`.screen` の中）に付く。`.attack-motion-clone` と
`.drag-ghost` は body 直下。縮尺の外にあるのは後者だけなので、この2つを同じ規則で
まとめて指定しないこと**（いま1つの規則でまとめてあるのが混乱のもと）。

### (3) 魔導板上でキャラクターをドラッグすると、下にカード枠画像が残る

**実測（特殊マス `data-map-board="summon"` のキャラクターに `dragging` を付けた時）**

| レイヤ | 中身 | ドラッグ中 | あるべき姿 |
| --- | --- | --- | --- |
| `.character-frame-layer` | `summon_frame4.svg`（**カード枠**） | display:block / opacity:1 / border:5px | **消す** |
| `.board-frame-layer` | `m_board_frame.svg`（**マス枠**） | display:none / hidden | **残す** |
| `.map-boundary-layer` | 特殊マスの境界 | display:none / hidden | **残す** |

**完全に逆。** 残すべきマス枠と境界が消え、消すべきカード枠が残っている。

- `index.html` 14870行付近（「通常マスは既存のdragging非表示規則に従い、枠を消す」の直前）の規則が
  `[data-map-board].dragging > .character-frame-layer` を `display:block/opacity:1/border:5px` で
  **見せて**いる。通常マスと同じく消す側へ変える。
- `index.html` 14991行「特殊マス上のキャラクターは、下側のマス枠・境界線をドラッグ中だけ隠す」が
  `.board-frame-layer` と `.map-boundary-layer` を `display:none` にしている。**この規則を消す。**
  14887行「魔導板のキャラクターを掴んだ時も、強化カードと同じくカード下のマス枠を残す」と
  正面から矛盾しているので、**残す側に統一する**。

### (4) 特殊マス上の強化カードをドラッグすると、下の枠線が細くなる

**実測（特殊マスの強化カードに `dragging` を付けた時）**

| | ドラッグ前 | ドラッグ中 |
| --- | --- | --- |
| `::after`（カード枠 `enchantment.svg`、border **5px**） | display:block / opacity:1 | display:none / opacity:0 |
| `.board-frame-layer`（マス枠 `m_board_frame.svg`、border **0px**） | display:block | display:block |

カード枠（5px）が消え、**border:0 のマス枠だけ**が残る。残った線は
`m_board_frame.svg` が自前で描いている線だけなので、特殊マスの5pxより細く見える。
15004行「特殊マス上の強化カードは、ドラッグ中も元の5px枠を維持する」は `::after` に5pxを
指定しているが、**その `::after` 自体が display:none にされているので効いていない。**

**直し方**：ドラッグ中に残る側（`.board-frame-layer` か `.map-boundary-layer`）へ
特殊マスの5px線を持たせる。`::after` を消さず背景だけ透明にして5px枠を残す手もあるが、
**「マス枠の線はマス枠のレイヤが持つ」に寄せる方が後々ぶれない。**

### 残り2件（2026-09-11 実機報告）：ドラッグ時の枠線

**(1) 攻撃アニメーションと (3) 魔導板キャラのカード枠残りは直った。**
残っているのは下の4ケース。**利用者の実機報告なので、これが正**。

| ドラッグするもの | 症状 |
| --- | --- |
| 特殊マスのキャラクター | **下に残る枠線が細くなる**（特殊マスは5pxのはず） |
| 通常マスのキャラクター | **下に残る枠線が消える**（通常マスは2pxで残るはず） |
| 特殊マスのエンチャント | 下の枠線は正常。**掴んだカード（ゴースト）の枠画像と枠線が消える** |
| 通常マスのエンチャント | **掴んだカード（ゴースト）の線が太くなる**。他は正常 |

**2つの別問題が混ざっている。**

- **A：ドラッグ元に残る「マスの枠線」**（`.board-frame-layer` / `.map-boundary-layer`）。
  **掴んだのがキャラでもエンチャントでも、そのマスの太さで残ること**
  （通常マス2px／特殊マス5px）。いまはキャラの時だけ細い・消える。
  `_hideDragSourceParts()`（`js/engine/reward.js` 2752行〜）の復帰処理が
  カード種別・マス種別で枝分かれしており、太さを与えていない枝がある。
  **枝を増やさず、「マス枠はマスの太さで残す」1本にまとめること。**
- **B：ゴースト（`.drag-ghost`）側のカード枠**。
  **エンチャントカードは枠を `::after`（疑似要素）で描いている**のが原因。
  疑似要素は JS から inline で触れないので、`_createDragGhost()`（同 2426行〜）が
  やっている「元の computed 線幅 × `_gameScale()` を写す」補正が**効かない**
  （→ 通常マスで太いまま）。また特殊マス用に `::after` を `display:none` にする規則が
  ゴーストにも当たって**枠画像ごと消える**（→ 特殊マスで消える）。

  **根本策：エンチャントの枠も `::after` をやめ、キャラクターと同じ実要素のレイヤで描く。**
  そうすればゴースト側で inline に太さ補正も表示制御もできて、両方いっぺんに直る。
  `::after` のまま押さえ込もうとすると、また `!important` の積み増しになる。

**共通の根っこ（上に書いたもの）を忘れないこと。** 実カードは
`.screen{transform:scale(var(--game-scale))}` の中、ゴーストと攻撃複製は body 直下。
絶対pxの線は body 直下で `1/game-scale` 倍に太る。

### 確認のしかた（画面を見られない環境なら必ずこれを使う）

```js
// 実カードと body 直下の複製で、画面上の線の実寸を比べる
const card=document.querySelector('#hand-slots.board-slots > .card');
const fl=card.querySelector('.character-frame-layer');
const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'));
const w=parseFloat(getComputedStyle(fl).borderTopWidth);
console.log('実カード', (w*scale).toFixed(2)+'px', '／ CSS指定', w+'px');
```

ドラッグ中の見え方は、実際に掴まなくても
`el.classList.add('dragging','drag-source-parts-hidden')` を付けて
各レイヤの `display / opacity / visibility / borderTopWidth` を読めば再現できる。
**`--game-scale` が 1 の窓では (1)(2) は再現しない。** 必ず `0.5` などに落として確かめること。

---

## 8-7. （完了）使っていない「売却」「還魂」ボタンの要素を消す（2026-09-13 利用者指示）

**この節は完了済み。** 以後守る規則は `HISTORY.md` を見ること。以下は経緯の記録。

**仕様（利用者）**：売却・還魂は**価格ラベル／還魂ラベルそのものをクリック**して行う。別の「売却」「還魂」ボタンは使わない。
残っている要素とCSSを消す。**ラベルの見た目・位置・表示条件（ホバー時だけ出る等）・発光は一切変えないこと。**

**調査済みの現状**

| 対象 | 場所 | 状態 |
| --- | --- | --- |
| 売却待ちカードの `<button class="shop-pending-sell-btn">売却</button>` | `js/engine/reward.js` 1747付近・1792付近（同じ処理が2箇所） | **独立したボタンが残っている。** 売却（`_sellPendingShopCard(rewIdx)`）はこのボタンにしか付いておらず、隣の `<div class="shop-board-sell-value">` はクリックできない |
| 魔導板の売却ラベル／祭壇の還魂ラベル | `reward.js` 4158・4160 | ラベル自体が `<button class="discard-btn shop-board-sell-value shop-board-sell-btn shop-board-sell-action">`。`shop-board-sell-btn` は**旧ボタン時代のクラス名が残っているだけ** |
| 手持ちアイテムの売却ラベル | `reward_items.js` 112-118 | ラベルは `shop-board-sell-value shop-board-sell-action`。113行の `.shop-board-sell-btn` 削除は不要 |
| その他の参照 | `reward.js` 1839・2496・2741（`copyShopOverlayStyle('.shop-pending-sell-btn')`）・3262 | `.shop-pending-sell-btn` の後始末・複製 |
| CSS | `index.html` の `.shop-pending-sell-btn` / `.shop-board-sell-btn` を含む規則（`grep -n` で約30箇所。7117-7121・10239・12094-12130・13097-13130・13560-13565・14741-14805・14916・14999-15022 など） | 旧ボタン（`button_invisible_s.svg` 132x62・top:94／230px・ホバー時display:flex・::after発光）の指定 |

**直し方**

1. 売却待ちUI：`shop-pending-sell-btn` を作らない。価格ラベルを
   `<button type="button" class="shop-board-sell-value shop-board-sell-action" data-sfx-silent="1">` にし、
   クリックで `ev.stopPropagation(); _sellPendingShopCard(rewIdx);`。2箇所の同じ処理は1つの関数にまとめる。
   売却待ちラベルに `pointer-events:none` が当たっているならクリックできるように直す（見た目は変えない）。
2. 4158・4160 のラベルから `shop-board-sell-btn` を外す。`reward_items.js` 113行を消す。
   `reward.js` の `.shop-pending-sell-btn` 参照（1839・2496・2741・3262）を消す。
3. `index.html` から `.shop-pending-sell-btn` と `.shop-board-sell-btn` のセレクタを消す。それだけで構成される規則は規則ごと消す。
   **注意：今のラベルは `shop-board-sell-btn` も持っているので、旧ボタン用の規則の一部がラベルにも当たっている。**
   消す前に、次の4種のラベルについて**計算済みスタイル**（通常時とホバー時の display・position・top/right・width/height・
   background-image・z-index・pointer-events・cursor・`::after` の background-image と opacity）を記録し、消した後と比べること。
   魔導板の売却ラベル／祭壇の還魂ラベル／手持ちアイテムの売却ラベル／売却待ちカードの価格ラベル。
   値が変わるものは、その規則のセレクタを `.shop-board-sell-action` に置き換えて**今の見え方を保つ**
   （例：`:has(.shop-board-sell-btn):hover` のカード発光消し、ホバー時の外周発光）。何を置き換えたかは報告する。
4. 検査ツールの参照も直す：`tools/parity/shop_ui_visual_check.js` 28行（`.shop-board-sell-btn` → `.shop-board-sell-action`）、
   `tools/parity/current_issues_check.js` 211・213行。
5. `index.html` の `reward.js` / `reward_items.js` の `?v=` を上げる。

**確認**：変更した全JSの `node --check`、`node tools/parity/shop_ui_visual_check.js`、`node tools/parity/current_issues_check.js`、
`node tools/parity/anim_check.js`（ローカルサーバーは http://127.0.0.1:5500 で起動済み）。
上の計算済みスタイルの前後比較の結果と、消したセレクタ・規則の一覧、置き換えたセレクタを日本語で報告する。実機は未確認と書く。

---

## 8-8. （完了）図書館チュートリアル（結界の追加／ホバーだけ反応させる）（2026-09-14 利用者指示）

**この節は完了済み。** 以後守る規則は `HISTORY.md` を見ること。以下は経緯の記録。

**1. 貸出カードに「結界」を足す。**
`js/engine/map.js` の `_libraryLoanCards()` の `loanNames` 末尾に `'結界'` を足す（`PANEL_POOL` の `panel_shield`、シートに行あり）。
チュートリアルの手順（`steps`）はリザードマンと野生の力しか使わないので、手順は変えない。

**2. チュートリアル中も「ホバーは反応、操作は不可」にする。**

- 現状（調査済み）：`index.html` の `body.library-tutorial-lock #scr-battle *{pointer-events:none!important}` で、
  `.library-tutorial-allowed` 以外の要素がマウスに一切反応しない。ホバー説明は `render.js` の `_initKwTooltip()` が
  `mousemove` の `e.target.closest('[data-preview]')` で出すため、**リザードマン（許可カード）以外はホバー説明が出ない**
  （利用者報告：矢印以外ホバー反応しない）。
- 仕様（利用者）：**クリック・ドラッグ・ドロップは今まで通り不可。ホバー（説明・ホバー時の見た目）は反応させる。**
- 直し方：
  1. CSS で `pointer-events` を奪うのをやめる（上の規則を消すか、`#scr-battle` 内のカード・貸出カード・魔導板のマス・
     アイテム／指輪枠など**ホバー説明を持つ要素**には `pointer-events:auto` を返す）。暗転（`.library-tutorial-dim`）と
     説明ボックスの `pointer-events` の扱いは今のまま。
  2. 操作の禁止は `map.js` のチュートリアル内の document キャプチャで行う。既存の `block`（pointerdown）と
     `advanceClick`（click）に加えて、許可外（`.library-tutorial-allowed` / `.library-tutorial-box` の外）の
     `dragstart` は `preventDefault()`、`dragover`／`drop` は既存のドロップ処理へ届かないよう `stopPropagation()`
     （`preventDefault()` しない＝ドロップ不可）。`finish()` で必ず外す。
  3. 移動ステップ（4-2・5-2）で「許可カード → 許可マス」のドラッグ＆ドロップが今まで通りできること。
- **マウスで操作できる要素が増えるので、許可外へ置けてしまう経路が無いかを確認すること**（ドロップ先・クリック・右クリック）。

**確認**：変更した全JSの `node --check`。`index.html` の `map.js` の `?v=` を上げる。
ヘッドレス検査はこの環境ではサーバー／Chromeにつながらないので実行しなくてよい（Claude側で確認する）。
変更点と、許可外の操作を止めている箇所の一覧を日本語で報告する。

---

## 8-9. （完了）文字サイズを整数pxにそろえる（2026-09-14 利用者指示）

**この節は完了済み。** 以後守る規則は `HISTORY.md` を見ること。以下は経緯の記録。

**方針（利用者承認済み）**：文字サイズの指定値を整数の px にそろえる。作業前にコミット済み（`646eb1e`）。

**対象と置き換え**（`html{font-size:28px}` なので 1rem＝28px）

| 今の指定 | 置き換え | 例 |
| --- | --- | --- |
| rem（`font-size` と `font` 省略形の文字サイズ部分） | rem×28 を四捨五入（.5 は切り上げ）した整数px | `.68rem`→`19px`、`1rem`→`28px` |
| 小数px（同上） | 四捨五入した整数px | `43.82px`→`44px`、`24.8px`→`25px`、`19.84px`→`20px` |

- 置き換える場所：`prototype/index.html` の `<style>` 内の CSS（`@media` の中も）、HTML の `style` 属性、
  `prototype/js/` 配下の JS 文字列の中の `font-size:…`（`local_xlsx_data.js` は除く）。
- **`font-size` と `font` 省略形の「文字サイズ」以外は触らない。** margin・padding・gap・width・line-height などに使われている rem はそのまま。
  `font` 省略形は `700 .68rem/1.2 …` の `.68rem` の部分だけを変える（`/1.2` の行の高さは変えない）。
- `!important` や前後の書き方はそのまま残し、値だけを変える（規則の順番・セレクタは変えない）。

**触らないもの**

- `calc(22px * var(--game-scale))` のような表示倍率を掛ける指定（元の数値は整数）。
- JS でその場で計算する値（`${fs}px` など、枠に収めるための縮小）。
- `font-size:0`、`em`・`%` 指定（6箇所。親の文字サイズを実画面で確かめる必要があるので Claude 側で直す）。

**確認**：変更した全JSの `node --check`。置き換え後に、`font-size`／`font` 省略形の中に rem と小数px が残っていないことを
スクリプトで数えて報告する（残りは0件のはず。表示倍率・JS計算・em・% は除く）。`index.html` の変更したJSの `?v=` を上げる。
ヘッドレス検査はこの環境ではサーバー／Chromeにつながらないので実行しなくてよい（Claude側で確認する）。
置き換えた件数（rem／小数px）と、置き換え前後の値の対応表を日本語で報告する。git commit はしない。

---
