# VFX LAB（2026-10-15 改修）

`prototype/tools/vfx_preview.html` を開く。ビルド不要。ゲームの VbFx 定義・共通レンダラー・SE候補をそのまま読み、LABだけで割り振りを編集する。ゲームへの適用は保存JSONを読んで行う別作業。

## 起動と確定保存

prototype/ で実行する。

```sh
python3 tools/vfx_preview/lab_server.py 5500
```

[http://127.0.0.1:5500/tools/vfx_preview.html](http://127.0.0.1:5500/tools/vfx_preview.html) を開く。サーバーは **127.0.0.1だけ** で待ち受け、prototype/ を通常の静的ファイルとして配信する。

画面上部の **確定保存** は全演出の見出し・タグ・割り振りと、全分類の汎用VFX抑止をまとめて保存する。保存先は `tools/vfx_preview/lab_assignments.json`。2回目以降、直前のファイルの内容を `lab_assignments.prev.json` に残す。保存先は固定で、JSONを検証してから一時ファイル経由で置き換える。

通常の `python3 -m http.server` や file:// でもLABは使える。POSTできない場合は同じJSONを **lab_assignments.json** としてダウンロードし、「サーバー保存できなかったのでダウンロードしました」と表示する。そのファイルを `tools/vfx_preview/` に置けば、次のHTTP起動で読み込む。

ブラウザの file:// 制限でJSONを自動取得できない場合は **JSONを読み込む** から選ぶ。前回このブラウザで確定した内容と編集中の下書きは localStorage にも残す。下書きは同じ保存日時のファイルに対してだけ復元し、**未保存** と表示する。localStorageだけで確定保存を済ませた扱いにはしない。読込失敗時は画面に理由を表示する。

## 8ページ

| ページ | データ源 | 現在の行数 | プレビューの場面 |
|---|---|---:|---|
| 演出の一覧 | VbFx.effects（共有派生を含む全定義） | 103 | 既存の効果別サンプル。陣営・発生元・対象を変更可能 |
| キャラクター | card（C番号のみ） | 107 | 味方前衛中央。肩代わりは本人の上 |
| エンチャント | enchant | 82 | 付与先の味方を発生元にした戦闘盤面 |
| アイテム | item | 12 | 使用対象の魔導板カード。次の戦闘用の効果は戦闘盤面 |
| 指輪 | ring | 43 | 指輪が発動した味方の上 |
| 敵／NPC | enemy + char | 81 | 敵後衛中央（後衛を3体にして中央を発生元にする） |
| 魔導板強化 | mapPanelPower | 6 | 魔導板5列×3行。中央が既定で、マスをクリックして変更可能 |
| その他 | keyword + specialFx | 38 | 状態はカード上で継続表示。その他は対応する戦闘／共通演出 |

分類表は被弾・消滅・発動の光も含め、台帳の全VFX/SE経路を表示する。行をクリックすると選択・再生。番号・名前、VFX/SE設定、LAB割り振りで絞り込める。★は従来どおりブラウザ内の確認印。

分類ページは **編集中の割り振り（保存済み内容を含む）→現行のゲーム演出** の順で再生する。複数指定は順に比較する。「LAB再生」は従来の試作候補、「現行再生（近似）」は採取した個別経路の比較。素体やラベルが一致しただけの試作を、現在ゲームで使う割り振りとは表示しない。

魔導板は本体の `board.svg` と `magic_board6.svg` を使い、カード260×395・マス間28の5×3配置を再現する。シーン全体はLAB内に収まるよう中央に配置し、背景は選択中の戦闘背景を使う。マス変更のVFXは既存preview.jsの配置（カード基準の16:9ホスト）を使う。本体のG・報酬画面を起動しない。

## 演出の一覧と割り振り

見出しは見た目の短い説明。色・形・動き・用途のタグと初出日を `lab_meta.js` に置く。初出日の新しい順、同日は従来の定義順。未登録の新規定義は先頭に置いて **見出し未設定** と表示する。LABで直した見出し・タグは保存JSONを優先する。

左の検索は見出し・タグ・効果名・現在の割り振り先・編集した割り振り先が対象。SE候補は既存3候補を聴き比べる。候補がない演出は、存在すればゲームSE、状態表示などは無音。

各効果の下で、現在の割り振りとその根拠を見る。`cards_routes.js` の採取経路、`present.js` の `PRESENT_LAB_FX` / `KEYWORD_ASSET_KEYS` / 倍率表、`battle_fx.js` の状態対応を参照する。`catalog.source`・カード名が似ていることから割り振りを推測しない。未採取・未採用のものは **不明**。

「＋ この割り振りを編集へ」で現在の行を取り込むか、番号・名前で候補を検索して追加する。効果ごとに **最大10件**。対象・発動種類・SE（候補／今のゲームSE／無音）を選び、×で削除する。`assign: []` は編集による上書きなし（現行ゲームを継続）。現在の経路は読み取り用で、編集欄を確定保存して実装用の指定を残す。

全103件の見出し・タグの下書きは [lab_layout_report.md](lab_layout_report.md) にも記載。

## 汎用VFXの抑止

分類表と詳細に **再生しない** チェックを並べる。カードごと・汎用効果ごとに独立する。

- S005〜S009、被弾、消滅、発動の光など：採取した実経路から列挙。
- キーワードの演出：シートのキーワード／合体キーワードと `KEYWORD_ASSET_KEYS` を結ぶ。効果文中に出る語を、そのカード自身のキーワードとはみなさない。
- 結界・毒・弱体・根性・復活の状態：battle_fx.jsの対応で追加。
- チェックは個別経路・分類ページの優先再生・自動で続くVFXに反映し、確定保存の `suppressGeneric` に番号ごとに記録する。ゲーム本体は変更しない。

## JSON契約

```json
{
  "version": 1,
  "savedAt": "2026-10-15T00:00:00.000Z",
  "effects": {
    "dark-fire": {
      "title": "黒い炎の波",
      "tags": ["黒", "紫", "炎", "波", "範囲", "攻撃効果"],
      "assign": [
        {"kind":"enchant","id":"E006","name":"闇の炎","trigger":"死亡","se":"game"}
      ]
    }
  },
  "suppressGeneric": {"C003":["S006"]}
}
```

kind は `character / enchant / item / ring / enemy / npc / board / keyword / other`。id はシートの番号、keyword は名前（シート番号と素材番号のずれを避ける）。se は `se_catalog.js` の候補ID、`game`、`null`。保存時は全演出を含める。保存日時が異なる外部ファイルがあれば古い下書きで上書きしない。保存中の追加編集は未保存のまま残す。

## 再生API・接続点

通常scriptの読み込み順で動く。ゲームの `js/`、index.html、assets、シートはこの改修で変更しない。

- `window.VbFxPreview.select(name, shouldPlay)` / `play(name)` / `stop()` / `snapshot()` / `playAll()` / `audition(id)` を保持。
- `window.VbFxCards.play(no)` / `playCurrent(no)` / `choose(no)` / `show(page)` / `stop()` / `cards()` / `history()` を保持。従来の `show('cards')` は `character` の別名。
- `playInScene` / `applyScene` は分類ページから使う追加API。通常の `select(name)` は従来の盤面を再構築するので、撮影時の効果名・配置・描画は変わらない。
- `tools/vfx_capture/capture.js` のURL/APIは変更していない。capture-board時は追加した編集UIを隠す。
- 既存のSEピーク合わせ、途中再生60msの立ち上げ、1.1秒のフェード、速さ・大きさを維持。
- `?verify=1` は全VFXの手動検査ボタン、`?verify=auto` は自動検査。通常URLでは検査を起動しない。

## 検査

```sh
node tools/vfx_preview/cards_scan.cjs --check
node tools/vfx_preview/cards_check.cjs
node tools/vfx_preview/cards_runtime_check.cjs
node tools/vfx_preview/lab_layout_check.cjs
node tools/balance_sim/vfx_data_regression.js
node tools/balance_sim/vfx_webp_regression.js
node tools/balance_sim/vfx_1012_regression.js
node tools/balance_sim/lab_vfx_regression.js
```

本体／シートを変更した後は `node tools/vfx_preview/cards_scan.cjs` で台帳を再採取する。採取は実際の共通presenter→LABの呼び出しも通す。自己検査は反復型VFXについて、各対象が各脈動で1回ずつ命中したことを検査する。

lab_layout_checkは全定義の一意掲載・タグ・安定ソート・分類の全経路・編集中の優先再生・発生位置・抑止・保存JSON往復・下書き・ダウンロードを検査する。さらに一時フォルダにサーバーを起動してPOST/GETを検査する。環境がTCP待受を禁止する場合はその部分を **未実行** と出し、子Pythonで実HTTPハンドラーの解析・ファイル書き込み・バックアップを実行する。

画面の目視・音の聴感・Chromeでの撮影比較は別途必要。NodeのCanvas代替の通過を、画面確認の代わりにはしない。台帳の未成立条件は不明のまま表示し、現行素材／関数の比較再生は対象選択・移動などを完全再現する戦闘シミュレーターではない。

## ファイル

| ファイル | 役割 |
|---|---|
| ../vfx_preview.html | LABの入口と読み込み順 |
| preview.js / preview.css | 既存の再生・SE同期・盤面・撮影API |
| catalog.js / se_catalog.js / se/ | サンプル設定と既存SE候補（本改修では変更なし） |
| cards.js / cards.css / cards_model.js | シートごとの分類表、比較再生、確認印 |
| cards_scan.cjs / cards_routes.js | 本体の実経路の採取と台帳 |
| lab_meta.js | 全演出の見た目の見出し・タグ・初出日の下書き |
| lab_model.js | 8分類、現行割り振り、汎用効果、保存契約 |
| lab_store.js | 確定ファイル・下書き・POST・ダウンロード |
| lab_ui.js / lab.css | 割り振り・見出し・タグの編集、確定保存バー |
| lab_server.py | 127.0.0.1の静的配信と固定保存先へのPOST |
| lab_layout_check.cjs | 一覧・全経路・保存・サーバーの検査 |
| lab_layout_report.md | 改修結果と全103件の見出し・タグ |
| [se/README.md](se/README.md) / [se/ADOPTED.md](se/ADOPTED.md) | SEの原本・加工・採用表 |
