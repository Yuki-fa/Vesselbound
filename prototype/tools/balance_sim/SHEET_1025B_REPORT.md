# 2026-10-25 シート改訂：効果と検査の報告

指定45枚の通常・強化後を、両陣営で数値まで検査した。本文180通り、回帰193件が成功。
戦闘ルールは `js/battle/core.js`、編成の補完は `formation.js`、起動の対象選択と適用は `activation.js`。
本文の数値は内蔵CSVから読み、効果文の解析で決める。シート・内蔵CSV・assets・VFX/SE割り当て表は変更していない。

以下の「既存」は改訂済みの本文を既存処理で実行でき、今回数値を確認したもの。「修正」は既存カード／効果の修正、「新規」は今回実装した効果。
`keyword_effect` の括弧内は `effect`、`stat_change` と `damage` の括弧内は `reason`。各トリガの既存 `effect_flash`、マナの `mana_threshold` は表のほかにも出る。

## カード別の確認結果

| カード | 状態・通常／強化後の挙動 | 主な出来事 |
| --- | --- | --- |
| C001 アラストル | 新規。3マナ毎に負傷1ダメージ×1回／2回を戦闘限定で付与。同じ体への重複と通常＋強化の混在を保持 | `keyword_effect(trigger_grant)`、`damage(granted_injury_damage)` |
| C002 エリニュス | 新規。赤の味方の負傷を観測して2ダメージ×1回／2回。本人・負傷効果を持たない味方も観測 | `damage(ally_color_injury_damage)` |
| C003 マモン | 新規。所持アイテム枠を破壊して80G／160G。獲得直後不可・戦闘ごと1回を維持 | 起動結果 `destroy_item_gold` |
| C004 エキドナ | 新規。味方死亡ごとに、生存する敵味方へ同時1ダメージ×1回／2回。死体を除外 | `damage(ally_death_all_damage)` |
| C005 アトラス | 新規。敵からの実ダメージの半分切捨て／全量を他の生存味方へ均等分配、余りは別々の味方へランダムに1ずつ。他にいなければ全量を本人が受ける | `damage` の `redirectedFrom`、`effect_flash(passive)` |
| C026 ナハツェーラー | 既存。死亡で全敵に毒3／6 | `keyword_effect(poison)` |
| C027 ドラウグル | 既存。死亡で全敵に2ダメージ×1回／2回、各波を同時処理 | `damage`（`damageKind:death_effect`） |
| C028 アムピスバエナ | 新規。開戦の色がちょうど3種類の時だけ全味方へ毒牙3／6。取り込み時の本人への誤付与も修正 | `keyword_effect(keyword_gain)`、`keyword:毒牙3/6` |
| C029 ジャンシー | 新規。死亡でランダムな別々の味方1体／2体へ復活。本人の常時復活として誤読しない | `keyword_effect(keyword_gain)`、`keyword:復活` |
| C030 アルプ | 新規。攻撃で血4を消費して全味方+4/+4／+8/+8。血不足なら消費も強化もしない | `blood_set`、`stat_change(attack_blood_spend_team_buff)` |
| C051 マンティコア | 既存。負傷で全敵に毒2／4 | `keyword_effect(poison)` |
| C052 サンダーバード | 新規。2マナで1回だけ、ゲーム中の眷属へ衝撃1／2。既存・後続・次戦闘・復活・保存を確認 | `summon_buff`、`keyword_effect(keyword_gain)`（`reason:summon_keyword_buff`） |
| C053 ヒュドラ | 新規。毒を持つ敵だけを抽選し、その毒の値で1回／2回ダメージ。反復ごとに再抽選 | `damage(attack_poison_damage)` |
| C054 キマイラ | 新規。開戦+2/+2を色数／色数×2回、毎回再抽選 | `stat_change(opening_color_count_buff)` |
| C055 ノルン | 新規。2マナ毎に報酬・トレーダーのHP+1／+2を累積。既存の報酬強化・保存経路を使用 | `run_effect`、`kind:reward_buff`、`trigger:マナ` |
| C076 タロス | 既存。開戦に未所持の別々の味方1体／2体へ結界 | `keyword_effect(shield)` |
| C077 ティアマト | 既存。味方眷属の召喚ごとにゲーム中の眷属HP+1／+2を累積。敵の召喚では増えない | `summon_buff`、`stat_change(summon_buff)` |
| C078 ヴァルキリー | 新規。死亡で同じ抽選対象へ+2/+2と結界、1回／2回。反復ごとに再抽選 | `stat_change(death_random_ally_shield_buff)`、`keyword_effect(shield)` |
| C079 スフィンクス | 既存。3マナ毎に赤・黄・紫から1体ずつ、+2/+4／+4/+8 | `stat_change(mana_random_colors)` |
| C080 チェンジリング | 新規。魔導板→報酬の順に2対象を選んで交換後、本人へ永久-2/-2／-1/-1。ATK0・HP1を下限にし、`_placeKey`を保持 | 起動結果 `exchange_reward` |
| C101 アンタイオス | 新規。エンチャント未接続なら負傷で全味方+3/+3／+6/+6。本文が空のキーワード専用エンチャントも実編成・payloadで接続として扱う | `stat_change(injury_unenchanted_team_buff)` |
| C102 ストリゴイ | 新規。正の血獲得1件ごとに1／2を加算、複数体は加算。0獲得・消費は補正しない | `effect_flash(passive)`、加算後の `blood_set` |
| C103 カトブレパス | 新規。死亡で全生存キャラクターに弱体2／4、敵味方とも対象 | `keyword_effect(weaken)` |
| C104 モリガン | 新規。攻撃で紫の味方だけにATK+3／+6 | `stat_change(attack_color_atk_buff)` |
| C105 ケール | 新規。血の確定値が正の3の倍数になれば全敵に3／6ダメージ。直接の死亡があれば反復、連鎖は1体20波まで | `damage(blood_multiple_damage)` |
| C007 マータ | 修正。旧肩代わりとその専用表示経路を削除。負傷で全敵に弱体1／2、防戦なしを確認 | `keyword_effect(weaken)`、`effectTrigger:injury` |
| C010 ドワーフ | 既存。2マナ毎に別々の赤2体へ+3/+2、強化は2回 | `stat_change(mana_threshold_random_color)` |
| C018 フォルモール | 既存。負傷で赤・青・緑から1体ずつ+3/+3、強化は2回 | `stat_change(injury_random_color_buff)` |
| C021 センチネル | 既存。赤センチネル以外の味方へ現在HPと同じHPを付与、強化は2回 | `stat_change(sentinel)` |
| C031 ゾンビ | 既存。死亡で青・緑・紫から1体ずつ+4/+2、強化は2回 | `stat_change(death_random_color_buff)` |
| C058 アラッサス | 既存。攻撃で全敵に4／8ダメージ、同時の束を維持 | `sweep_vfx`、`damage`（`damageKind:attack_effect`） |
| C067 ウォーグ | 既存。3マナ毎に緑・黄・紫から1体ずつ+2/+4、強化は2回 | `stat_change(mana_random_colors)` |
| C099 スプリガン | 既存。4マナ毎に未所持の別々の味方1体／2体へ結界 | `keyword_effect(shield)` |
| C017 ギガンテス | 修正。負傷ダメージ量でなく、赤の生存味方数×1／2を全味方ATKへ加算 | `stat_change(gigantes)` |
| C020 エティン | 修正。味方の負傷効果の発動で永久+1/+1／+2/+2 | `stat_change(ettin)`、`persistent`、`boardSlot` |
| C034 バンシー | 修正。死亡で全敵へ毒1＋弱体1／毒2＋弱体2の両方を付与 | `keyword_effect(poison)`、`keyword_effect(weaken)` |
| C046 レヴナント | 修正。通常死亡の全味方ATK+3／+6は既存どおり。生存中の死亡効果直接発動では本人も対象に含める | `stat_change(death_all_atk)` |
| C047 デュラハン | 修正。敵味方の眷属召喚ごとに永久+1/+1／+2/+2 | `stat_change(summon_observer_stats)`、`persistent`、`boardSlot` |
| C070 ハイドラ | 既存。敵1体が状態異常を得るごとに全味方HP+1／+2 | `stat_change(enemy_ailment_hp)` |
| C092 シャナ | 修正。味方の攻撃効果の発動で永久+1/+1／+2/+2。旧眷属強化は発動しない | `stat_change(ally_attack_permanent_buff)`、`persistent`、`boardSlot` |
| C116 ヘルナイト | 修正。通常は魔導板・報酬のキャラクター、強化は報酬だけ。ATK・HPを対応する値の1倍／2倍で吸収 | 起動結果 `destroy`（既存） |
| C121 ナイトメア | 修正。味方の解放効果の発動で永久+1/+2／+2/+4 | `stat_change(ally_release_permanent_buff)`、`persistent`、`boardSlot` |
| E006 闇の炎 | 修正。別々の敵2体に3ダメージ、強化は再抽選して2波。対象不足なら存在する体だけ。各波を同時処理 | `damage`（`damageKind:death_effect`、`effectSource:false`、`batch`） |
| E084 名前未定 | 新規。死亡時のATK・最大HPの半分切捨て／全量をランダムな青味方へ加算。未実装フラグは変更しない | `stat_change(death_blue_stat_transfer)` |
| E085 名前未定 | 新規。攻撃で血1／2を獲得し、ストリゴイの補正も通す。未実装フラグは変更しない | `blood_set` |

## Claude向けの出来事の契約

既存の `type` だけを使用し、新しいイベント種別は増やしていない。VFX/SEの割り当ては別作業。

```js
// C001：付与は同じ体へ累積。再生側は絶対値の配列を使う。
{ type: 'keyword_effect', effect: 'trigger_grant', trigger: 'injury',
  side, unitId: targetId, sourceId: alastorId,
  effectText: '負傷：ランダムな敵に1ダメージを2回与える。',
  grantedInjuryEffects: [/* この体への全付与本文 */] }
// 付与からの命中：damageKindはinjury_effect。本人固有のダメージVFXを流用しない。
{ type: 'damage', reason: 'granted_injury_damage', effectSource: false,
  sourceId: grantedUnitId, unitId: enemyId, amount, hpAfter, damageKind: 'injury_effect' }

// C052：既存のゲーム中眷属強化にshockを追加。
{ type: 'summon_buff', side, sourceId, persistent: true,
  atk: 0, hp: 0, shock: gainedShock, totalAtk, totalHp,
  gameTotalAtk, gameTotalHp, gameTotalShock }
{ type: 'keyword_effect', effect: 'keyword_gain', reason: 'summon_keyword_buff',
  side, unitId, sourceId, keyword: '衝撃' + totalShock, keywords: [/* 更新後の全キーワード */] }

// C055：kindは既存と同じ。新しいtrigger「マナ」。
{ type: 'run_effect', kind: 'reward_buff', trigger: 'マナ', side, unitId,
  atk: 0, hp: gainedHp, effects: { rewardBuff: { atk: accumulatedAtk, hp: accumulatedHp } } }

// 起動：coreActivateBoardCardの戻り値。新kindはこの2つ。
{ kind: 'destroy_item_gold', gold }
{ kind: 'exchange_reward', atk: negativeAtkDelta, hp: negativeHpDelta }
// _playActivationFxのatにはkind・resultを渡す。
// マモン：{rect, kind, result}、チェンジリング：{index, rewardRect, kind, result}
```

新しいダメージreasonは `granted_injury_damage`、`ally_color_injury_damage`、`ally_death_all_damage`、`attack_poison_damage`、`blood_multiple_damage`。
エリニュスは `injury_effect`、エキドナは `death_effect`、ヒュドラは `attack_effect`、ケールは `other`。
複数対象はコアが `batch` を確定する。闇の炎は同時の束を持つが全体攻撃ではないため `area` は付けない。
アトラスの分配先は `damage.redirectedFrom: atlasId`。`sourceId` は元の攻撃者を維持する。

新しい能力変化reasonは `attack_blood_spend_team_buff`、`attack_color_atk_buff`、`injury_unenchanted_team_buff`、`opening_color_count_buff`、
`death_random_ally_shield_buff`、`death_blue_stat_transfer`、`ally_attack_permanent_buff`、`ally_release_permanent_buff`。
`ettin`・`summon_observer_stats` は既存reasonに永久強化の情報を追加した。
魔導板上の原本を持つ体には `persistent:true, boardSlot` を付ける。書き戻す原本がない召喚体には `persistent:false`。

## 解釈を確定した点

- キマイラの総回数は色数×本文の倍率。初回を別に加算しない。
- E084のHPは、死亡で0になる現在HPではなく最大HPを使う。半分はATK・HPを個別に切り捨てる。
- 今回の死亡付与・全体効果は、生存中に死亡効果だけを直接発動した場合、本文が除外を指定しない限り本人も候補に含める。
- 血の判定は獲得・消費1件の確定値ごと。途中で通過した倍数を数えない。ストリゴイの加算は既存の血→マナ変換より前に適用する。
- ケールは根性を死亡に数えず、復活しても実際の死亡なら反復する。再入は待ち行列で扱い、同じ誘発連鎖で1体最大20波（初回を含む）。定数は `CORE_BLOOD_MULTIPLE_MAX_WAVES = 20`。
- アトラスは本人の結界・弱体などを適用してから分配する。本人の弱体を二重加算せず、分配先の通常の防御・被ダメージ処理を通す。同じ命中の再分配はしない。
- チェンジリングは本人も最初の対象に選べる。その場合は報酬へ移った本人へ永久減少を残す。既存の配置制限・依頼カード制限・刻印制限は維持する。

## 検査結果と未確認範囲

- `sheet_1025b_regression.js`：193件成功。指定45枚×通常／強化×両陣営＝180本文を数値で確認。
- 未改訂328本文：作業開始コミット `62fe8751c3cefbe67c844ce70490a1ef52d0b8c4` のコアと、イベント・最終状態・次の乱数が完全一致。
- `effect_audit`、`card_core_smoke`、`offline_online_regression`、`battle_event_regression`、`pve_core_resource_parity`、`silence_scroll_check`：必須6本成功。
- `tools/balance_sim/*_regression.js` 70本：既知の `merge_effects_1012_regression.js` を除く69本成功。既存の `sheet_1022a`・`sheet_1023` も成功。
  旧マータ・旧シャナ・旧闇の炎・旧センチネル・旧ゾンビを前提にしていた期待値／対象を現行本文へ更新した。
  `merge_effects_1012` は、負傷観測を起こさない旧ハーネスがC002を空振りと判定する既知の検査不適合を残す。今回の本文は新規回帰で検証済み。
- `online_payload.js`・`online_receivers.js`：いずれもNG 0。新しい付与と衝撃の絶対値はオンラインplaybackでも別途検査した。
- 変更した全21JSに `node --check`、読み込まれる10JSの `?v=` 更新、`git diff --check` 成功。
- ブラウザー系の `present_parity`・`anim_check`・`loop_parity`、`save_contract_test`・`save_browser_test`・`save_summon_replay_test` は、すべてChromeへ接続できず検査本体の実行前に停止した。
  UI操作ツールにも利用可能なブラウザーがなく、画面・file://実機・聴感は未確認。
  代わりに通常起動のクリック処理、SaveRunの実際の戦闘フレーム計算・イベント圧縮復元・ラン保存復元をNodeで検査した。
