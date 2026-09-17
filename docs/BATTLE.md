# 戦闘ルール

戦闘コア、複数対象処理、盤面配列、効果検証、既知の互換処理を記録する。カード効果や戦闘進行を変更するときに読むこと。

## 4. 戦闘ルールの規則

### 戦闘ルールの置き場（重要）

**戦闘ルールは `js/battle/core.js` にのみ書く。** PvE（`js/engine/battle.js`）とPvP（`js/online/sim.js`）は
どちらもこのコアを呼ぶ。同じルールを2箇所に書くと、片方だけ直す事故が必ず起きる。

コアの制約（サーバーでもそのまま動かすため）：
- DOM を触らない / `G` を触らない / `Math.random`・`Date.now` を使わない（乱数は引数の rng だけ）
- 同期のみ。演出の待ちは呼び出し側がイベントを見て行う

`battle.js` に残っている同名関数（`_unitHasKeyword` / `getAttackTarget` / `_sealValue` 等）は
**コアへの1行委譲**であり、実装ではない。ここに条件を書き足さないこと。

#### コアが唯一の実装：判定・数値

| ルール | コアのAPI |
|---|---|
| キーワード判定（キーワード列＋効果文からの導出） | `coreUnitKeywords` `coreUnitHasKeyword` `coreUnitKeywordCount` |
| 数値付きキーワードの合算（毒牙3・邪眼2 等） | `coreKeywordSum` |
| 結界の値 | `coreUnitShieldValue` `coreShieldValueFromKeyword` |
| 生存・行動可否・攻撃力 | `coreIsSealed` `coreCanAct` `coreAttackDamage` |
| 攻撃対象の決定（守護・隠密・狩人・前衛優先） | `coreSelectAttackTarget` |
| 貫通の後衛巻き込み | `corePierceRearTargets` |
| 受けるダメージの確定（封印・結界・弱体・強靭） | `coreResolveIncomingDamage` `coreToughValue` |
| 加護Xの残り回数 | `coreConsumeWardCharge` |
| 封印と生贄（誰が封印されるか・何体必要か・誰を捧げるか） | `coreSealValue` `coreInitSealStates` `coreSacrificeUnits` `coreSealRelease` |
| 追加攻撃回数・攻撃範囲（二段/三段/全体/三方向） | `coreExtraAttackCount` `coreAttackSpread` |
| 「常時：味方の攻撃回数は1回追加される」の合計（疾風の指輪・タイタニア） | `coreExtraAttackTotal` |

#### コアが唯一の実装：効果・状態

| ルール | コアのAPI／処理 |
|---|---|
| 開戦・攻撃・負傷・死亡・終戦トリガ | `coreApplyOpeningEffects` `coreTriggerManaOnAttack` `coreApplyAttackEffects` `coreApplyInjuryEffects` `coreApplyDeathEffects` `coreTriggerBattleEnd` |
| データ駆動のマナ／ゴールド／アイテム効果 | `coreTriggerManaOnAttack` `coreTriggerManaOnInjury` `coreTriggerManaOnDeath` `coreTriggerBattleEnd` |
| 即死・毒牙・毒・邪眼・衝撃・弱体・生命吸収 | `coreApplyKeywordOnHit` |
| 毒のターン処理 | `coreApplyPoisonBeforeTurn` |
| 指輪・アイテム・マナ閾値 | `coreApplyOpeningRings` `coreApplyOpeningItems` `coreApplyRingManaEffects` `coreApplyManaThresholdEffects` |
| 召喚・変身・復活 | `coreSummonUnit` `coreTransformUnit` `coreTryRevive` |
| 魔導板・共振・熟練等の戦闘修正 | `coreUnitEffectText` `coreStatBonus` および開戦／各トリガ処理 |

### 複数対象への効果は「全員に入れてから、まとめて誘発」

全体ダメージのように複数のキャラクターへ同時に作用する効果は、
**1体ずつ「作用→その体の誘発」を解決してはいけない。** 全員へ作用させてから、
対象の並び順で誘発を解決する。1体ずつ解決すると、割り込み攻撃（ミノタウロスの
「負傷：直ちに攻撃する」）が残りの対象への作用より先に起き、誘発時点のHPも変わる。

コアの `coreResolveHit` は `{deferTriggers:true, collect:配列}` を渡すと
ダメージの確定だけを行い、誘発を配列へ積む。呼び出し側が全員ぶん確定させてから
`coreApplyHitTriggers()` を順に呼ぶ。

**攻撃と反撃も同じ扱い。** ひと続きの打ち合いなので、両方のダメージを確定させて
から誘発する。1発ずつ誘発まで解決すると、倒れた側の死亡効果（闇の炎の1ダメージ等）
が反撃より先に起きる。

**ダメージ表示は原則として全対象同時。** ずらしてよいのは、VFXがそう見せる場合
だけ（アラッサスの薙ぎ払いは炎が当たった対象から順に出る）。キャラクターごとに
勝手にずらさないこと。

守るべき順番（両方で同じ）：

1. コアが確定した**イベントの順番どおり**に演出を出す。先取り・後回しをしない。
   死亡も同じ。まとめて後回しにすると「消える順番」が片側だけ変わる。
2. 数値・VFXを出し終えるまで、倒れたカードを消さない・盤面を詰めない。
3. 詰めてよいのは死亡イベントを処理する時だけ（`_deathFxReady` を立ててから）。
4. 召喚は「その場で姿が出る」演出。保留すると次の死亡まで画面に出ない。

### 盤面配列の持ち方もPvEとオンラインで同じにする

**生きている体を左詰めで並べ、前衛／後衛は `lane` で区別する。** 添字で前衛・後衛を
分ける持ち方（0..6／7..13）にしてはいけない。以前オンラインだけがそれで、召喚の
挿入位置も詰め直しも別実装になり、戦闘中の召喚が味方の左側へ出ていた。

| 用途 | 唯一の実装 |
| --- | --- |
| 召喚の挿入位置（戦闘中は前衛の右端／対象の左右） | `coreInsertSummonedUnit()` |
| 盤面の詰め直し（生存を左詰め） | `coreCompactUnits()` |
| 薙ぎ払いの見せ方（炎が当たった瞬間に数値） | `presentSweepAttack()`（render.js） |

`coreInsertSummonedUnit()` は `placementTargetId` が無ければ前衛の右端へ入れる。
**発生元IDで補ってはいけない**（同時召喚の並びが逆になる）。

**PvEの開戦配置は枠番号の位置へ置くので、配列に空欄（null）が残る。** 空欄を残したまま差し込むと
空欄ごと後ろへずれ、後衛が描画範囲（0〜`MAX_ALLIES`-1）の外へ押し出されて消える
（前衛・後衛にミテーラ→開戦でペリカン4体、で後衛のミテーラが14番へ。誰かが倒れて詰め直されると戻る）。
`coreInsertSummonedUnit()` は差し込む前に空欄を取り除き、`coreCompactUnits()` は空欄も詰める。

**「この戦闘中、召喚された味方は〜」（ファントム／エイドロン）は、既に召喚された味方とこれから召喚される味方の両方。**
コアで召喚した体と「復活」で再召喚された体に `_summonedInBattle` を付け、`coreAddSummonBuff()` が発動時に
生存中のそれらへ増えた分を足す（`stat_change` reason:'summon_buff'）。これから召喚される体は `coreSummonUnit()` で合計を受け取る。
`_panelSummoned` は魔導板から出撃した体にも付くので、この判定に使わないこと。

**自動テストの通過を「直った」と書かないこと。** 実機で見ていない項目は「未確認」と明記する。

### 効果の自動検証（効果に触る変更では必須）

```bash
node prototype/tools/balance_sim/effect_audit.js   # NG 0 になるまで直す（NGがあれば exit 1）
node prototype/tools/balance_sim/card_core_smoke.js
node prototype/tools/balance_sim/offline_online_regression.js
```

`effect_audit.js` は PANEL_POOL / ENEMY_POOL の全カードについて、効果文が持つトリガ
（開戦／攻撃／負傷／死亡／終戦／解放／Xマナ）ごとに最小シナリオを組んでコアを1回だけ発火させ、
次を機械判定する。

- 効果が**ちょうど期待回数**発動しているか（0回＝不発、2回以上＝二重実装を検出）
- p1 に置いた場合と p2 に置いた場合で対称に動くか
- 対象数が効果文と整合するか（「ランダムな敵に」＝1体、「全ての敵に」＝全体）

固定の回帰シナリオも含む。**効果を追加・修正したらここにも1件足すこと。**

- デュラハン回帰：味方死亡=1回／敵死亡=0回
- 幻影効果回帰：効果文もキーワードも持たない素のユニットの死亡で、イベントが1件も出ないこと

最小シナリオでは条件を満たせないカード（レイス・レムレース等）は
`conditional` の除外リストに入っている。**除外を増やしてNGを消してはならない。**
除外は「シナリオでは再現不能」な場合に限り、理由をコメントで残すこと。

### 効果をコアへ書く時に繰り返された失敗（必ず避けること）

移行作業で実際に埋め込まれ、プレイ不能級の不具合になったパターン。新規実装時も同じ形にしない。

1. **カード名ブロックと汎用テキストブロックの二重実装**
   `coreHasEffect(u,'デュラハン')` の分岐と `/味方が死亡するたび…/` の正規表現分岐の両方を書くと、
   該当カードは**2回発動**する。どちらか一方を正とし、もう一方に相互排他条件
   （`!coreHasEffect(u,'デュラハン')` 等）を必ず付ける。
2. **観測系トリガの陣営ガード漏れ**
   「味方が死亡するたび」は *観測者と同じ陣営の死亡のみ*。`dead.side === u.side` の条件を
   落とすと敵の死亡でも発動し、そのダメージで敵が死んで**死亡観測が再帰し全滅する**。
3. **`Math.max(1, coreEffectCount(unit, 'X'))` でループ回数を作る**
   Xを持たない全ユニットで1回発動してしまう。`coreEffectCount(...)` をそのまま使い、
   0回なら回らないようにする。
4. **データ駆動と効果文パースの二重加算**
   loader は効果文から `manaOnAttack` / `manaOnInjury` / `manaOnDeath` / `goldOnDeath` を
   **既に生成している**。`/^(\d+)マナを得る/` を追加で拾うと2回入る。
   テキストパース側に `&& !Number(unit.manaOnX)` のガードを必ず付ける。

### 既存の食い違い（勝手に揃えないこと）
- 追加攻撃回数と攻撃範囲：味方側は効果文からも拾うが、敵側はキーワード列だけを見る
  （`coreExtraAttackCount(unit,{fromKeywordsOnly:true})` で従来の挙動を保持している）
- 弱体：`_applyDamageState` は加算するが `dealDmgToEnemy` は加算しない
  （`coreResolveIncomingDamage(...,{skipWeaken:true})` で従来の挙動を保持している）
- **マータ・団結の分散はコアへ一本化済み**：PvEの`applyDamageBatch()`も
  `coreResolveHit()`の各対象damageイベントを使う。コアは`_uniteGroups`のスタンプ値を使い、
  旧実装の味方側限定・盤面接続の都度確認とは条件が異なるため、両陣営へ適用される。
- **団結の割り振り（2026-09-16 利用者指定）**：1つの「ダメージの束」（`coreBeginDamageBatch`〜`coreEndDamageBatch`）の間、
  団結メンバーへのダメージ（強靭の軽減後）をグループごとに合計し、束の終了時（`coreFlushUniteBatch`）に生存メンバー全員へ割り振る。
  合計÷人数の余りは「+1しても倒れない」メンバーへランダム（例：47→15/16/16、HP16のキャラは15）。
  合計が人数未満なら実際に受けたキャラへ1ずつ優先し、残りを他メンバーへランダム（合計1なら分けない）。
  1体ずつ即時に割っていた頃は、全体ダメージの余りが毎回先頭のメンバーに積もり、1キャラに集中していた。
  束の中の `coreResolveHit` は仮の `{amount:0,died:false}` を返し、終了時に書き換える。**束の中で戻り値をすぐ使わないこと**
  （先制の「倒したら反撃なし」は、団結の相手に限り束の終了後に判定して別の束で反撃する）。

### 旧互換処理について

新しい戦闘ルールを追加・変更する場合は、まず `core.js` に実装し、PvE／PvP双方のイベント接続だけを更新すること。
オフライン専用の名前分岐へ新規ルールを追加してはならない。
**元を残したまま新経路を足した時点で差し戻し対象**（＝実装を移して元を消すこと）。

### そのほか守ること（過去に事故になった形）

- **stateやDOM要素をユニットへ保持しない。** `state.units` はそのユニット自身を含むため循環参照になり、
  `clone()`＝`JSON.parse(JSON.stringify())` を使う経路（生贄スナップショット・再挑戦・セーブ）が
  例外で止まる。再入防止は `coreStateToken(state)` の**文字列トークン**で比較する。
  ユニットは常に直列化可能に保つこと（`effect_audit.js` の「ユニット直列化回帰」が見る）。
- **演出待ちで戦闘を止めない。** `requestAnimationFrame` はタブ非表示・最小化中に発火しない。
  戦闘フロー内のrAF待ちは `_awaitFrame(timeoutMs)` を使い、逆再生ループにも番人を置く。
  演出が途中で切れても戦闘は続けること。
- **先攻は同数なら乱数（PvE・PvP共通）。** `corePickFirstSide(state, rng)` が唯一の実装。
  PvEも `coreMathRng` を渡してこれを呼ぶ。神速・疾風の指輪による先攻もこの中で処理する。
- **戦闘中の召喚は前衛の右端にだけ出る。** 前衛が満杯なら成立しない。後衛へ逃がすと陣営の上限（14体）を
  超え、編成していない後衛枠にキャラクターが現れる。後衛へ置いてよいのは開戦時の配置だけ。
- **ライフは `G._waveLife` が実値。** 表示・宿屋の回復・敗北時の減少はすべてこれを動かす。`G.life` は旧来の値。
  コアへ渡す値は `_currentBattleLife()`、上限は `_currentBattleLifeMax()`（オンラインは5）。
- **ATK0＝逃走（FLED）。** コアは `fled` イベントを出すだけ。死亡ではないので死亡効果は発動しない。
- **開戦時のマナは必ず0。** マナは戦闘ごとの資源で、`startBattle()` が開戦時に `G.mana=0` へ戻す。
  **オンラインの編成送信で `G.mana` / `_ensureMana()` を読まない。両陣営とも `mana: 0`。**
  一般則：**戦闘開始時にオフラインがリセットしている状態は、オンラインの編成送信でも同じ値から始める。**
- **PvE の `applyHit` ラッパーはオプションをコアへそのまま渡すこと。**
  引数は `(source, target, amount, counter, skipSourceEffects, skipTough, options)`。
  4引数で受けて捨てると、`coreHitAll()` が指示する `deferTriggers` / `collect` が PvE だけ無効になり、
  1体ずつ即誘発になってオンラインと結果が食い違う。**引数を削らないこと。**
- **ミノタウロス**（`負傷：効果ダメージを受けた場合、ランダムな敵に攻撃する。`）は
  戦闘ダメージ（攻撃・反撃）では発動しない。判定は誘発時に控えた `damageKind`
  （`coreResolveHit` が `collect` へ積む時の種別）で行う。誘発をまとめて解決する時点では
  既に別の種別へ切り替わっているため、**その場で控えないと判定できない。**
  効果で誘発したミノタウロス自身の即時攻撃は、外側の `injury_effect` を引き継がず
  `coreWithDamageKind(state, 'combat', ...)` の中で `_coreAttackContact` を立てる。
  これを忘れると、その攻撃が発生元カードの効果ダメージとして再生され、
  アラッサス等の固有VFXが相手側から再発動する。
- **同じ瞬間（同じダメージバッチ）に鳴る命中音は、同じ鍵につき1本だけ鳴らす。**
  鍵は `_attackDamageSfxKey()`（武器種別＋威力段階）。判定は `presentDamageEvent()` の中＝両陣営共通の1実装。
  `playSfx()` は `<audio>` 複製の `play()` で鳴らすため1本ごとに鳴り始めがばらつき、
  同じ音を重ねると「ズレ」として聞こえる。音を足す時は必ず `playSfx()` を通すこと
  （`new Audio()` を直に使うと音量一元管理・ミュート・暖機のどれも効かない）。
  **暖機はプール上限（`SFX_VOICE_POOL_MAX`）まで行う。** 2本だと、前のターンの音が鳴り終わる前に
  同じ音が来た時点で冷えた複製を作ることになる。
- **ターン上限はPvEとコアで同じ定数（`BATTLE_CORE_TURN_LIMIT`＝500）を使う。**
  片方だけ変えると、決着が付かない盤面の引き分け成立タイミングが食い違う。
- **攻撃モーションまわりは2つの回帰で守られている**（`battle_event_regression.js`）。
  ① 進捗の起点は「実際に最初のフレームが来た時刻」。予約時刻を起点にすると、起動直後の
  デコードでメインスレッドが尺以上止まった時に1フレーム目で終端へ飛ぶ（＝モーションが再生されない）。
  ② `.slot.motion-hidden` は `transition:none!important`。`.slot` の `transition:all .18s` は
  `visibility` も対象なので、これが無いと飛んでいる複製と元位置の実カードが180ms同時に見える。
- **ダメージ数値の尺の式は `damageLabelDurationMs()`（render.js）が唯一の定義。**
  既定950ms・下限600ms（`labelDurationMin:0` で外せる）。呼び出し側に別の式を書かないこと。

---
