# セーブ・復元

セーブ対象、復元、プレイ時間、セーブ回帰検査に関する規則をまとめる。保存形式や進行状態を変更するときに読むこと。

### セーブに何を入れるか — `js/save/`

**オフラインの状態を `G` へ足したら、必ず `run_save.js` の `fields` にも名前を足すこと。**
（意図的な除外に当てはまる場合を除く。除外の4つは下の表）

`fields` は手書きの許可リストで、**ここに無い名前は保存されない。しかも何のエラーも出ない。**
再開したときだけ `initState()` の初期値へ静かに巻き戻る形で表面化する。
逆に入れてはいけないものを入れると `copy()` が保存時に例外を投げる
（関数・DOM・クラスのインスタンス・Infinity/NaN）＝その場で気づける。
**入れ忘れは静かに壊れ、入れ間違いは即座に落ちる。だから迷ったら入れる。**

**名前を足すのは後方互換**（古いセーブはその名前を持たないまま初期値で復元される）。
**名前を消す／グループを移すのは非互換**（`validate()` が古いセーブを
「未定義の状態です」で弾く）。どうしても要るときは `migrations.js` にステップを足す。

| 入れないもの | 例 | 理由 |
|---|---|---|
| `Set` は `fields` ではなく **`setFields`** へ | `_usedNamedElite` `_seenRarity3` | `fields` に入れると配列化されたまま復元され `.has()` が壊れる |
| 戦闘中の一時状態 | `allies` `enemies` `phase` `turn` `battleCounters` | `pendingBattle` のイベント列から復元するため、二重に持つと食い違う |
| 画面の開閉・選択状態 | `inventoryOpen` `_selectedBoardUnitIdx` `_showFacilities` | 再開時に前回のUI状態が復活してしまう |
| モード判定 | `_debugMode` `_onlineMode` `_savePresentation` | 起動時に決まる。保存すると再開でモードが混ざる |

`_runId` `_runSeed` `_runRngState` `questProgress` `difficulty` は `fields` ではなく
`serializeRunState()` が個別に書き出している（すでに保存済み。二重に足さないこと）。

**コレクション（`profile_save.js`）は自動。**
`identity()` がシートのNo.列からIDを組み立てて `cards`／`items`／`rings` に振り分けるので、
カード・アイテム・指輪を足すだけで発見・取得が記録される。コードを足す必要は無い。
例外は、No.が英字＋数字の形式でない場合（IDにならず記録から漏れる）と、
この3つ以外の**新しい収集カテゴリ**を作る場合だけ。

### performance.now() を保存しない（プレイ時間）

`performance.now()` はページを読み込み直すと0へ戻る。開始時刻だけを保存して
「今 − 開始時刻」で数えると、コンティニューのたびにプレイ時間が0へ戻る。
`runStats.playedMs`（積算）＋`startedAt`（この起動の開始）で数え、
`serializeRunState()` の頭で `_flushRunStatsPlayTime()` を呼んで今回分を畳む。
他の統計（味方死亡・敵撃破・最大ダメージ・最大ステータス）は `runStats` ごと
セーブへ入っているので再開しても消えない（実測で確認済み）。
