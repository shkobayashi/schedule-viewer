# 日本語ルール — 会話がつらい理由の分析（D1）

利用者が Cursor の Grok エージェントと**直接会話**するとき、日本語ルールは `.cursor/rules/japanese-prose.mdc` と `consult.mdc` に書いてあるが、体感とずれることがある。D1 では AGENTS と同型に **J1–J5（alwaysApply）+ examples 正本** へ組み直した。

## 要約（何がつらいか → どう直すか）

| つらさ | 根本原因 | 原則 | ガード |
| --- | --- | --- | --- |
| 結論が後ろに回る | ルールが「段落の書き方」から始まり、**チャットで先に結論**が目立たない | **J1** | alwaysApply の J1 を先頭付近に |
| 仕様書・英語論文みたい | グローバル user rule（英語 blog 調）と **日本語チャット** が同時に効き、優先が不明 | **J2** | J2 で「日本語依頼→日本語会話」を明記 |
| 正本・入口・経路が何指すか分からない | 禁止リストが短く、**良い言い方の型**が1例だけで長い | **J3** | examples に表形式の bad/good を集約 |
| 相談と通常チャットのルールが二重 | consult 全文が alwaysApply ではないが、japanese-prose が consult 参照で **長い** | consult.mdc は順序のみ、examples は型見本 | consult + examples 分担 |
| 例が出る／出ないが不安 | 「例は出さない」と「直し例が1個」が同居 | **J4** | 見本は examples、出力に写さないと明記 |
| PR/Issue だけ直る | 「チャット」節がファイル後方にあり、**alwaysApply でも後読みされがち** | **J2 J5** | 冒頭で「チャット含む」 |
| ルールが長くて守れない | 50行超を1ファイルに集約、チェックリストと禁止と例が混在 | **J1–J5 短文化** | examples + inventory |

## メモの束 → 根本原因 → 原則

| 旧 japanese-prose / consult の塊 | 根本原因 | 原則 |
| --- | --- | --- |
| 「どの文章でも」箇条書き | 編集向けチェックがチャットにも効くが、**優先順位が無い** | J1 |
| 「使わない」 | 比喩語の**失敗モード**（指すものが決まらない） | J3 |
| 「直し方の例」（2ファイル重複） | 1話題の長文見本だけでは**他話題に汎化されない** | J3 + examples |
| AGENTS 向け bad/good（prose 旧版） | 実装用語の言い換え集が prose に散在 | examples §AGENTS |
| 「チャットの回答」 | **会話調**が後ろにあり、Cloud タスク英語 query で英語出力になりやすい | J2 + 言語合わせ |
| consult「返答の順」 | 相談専用の**構造**は prose と別物 | consult.mdc（モード時） |
| consult「仕様と設計の相談」 | 設計相談の**姿勢**（推す案一つ） | consult.mdc |
| write-* の日本語 | JSON 不足を埋めない（**創作禁止**） | 原則 2（agents）+ examples 末尾 |

## 新構造が会話に効く理由

1. **alwaysApply の japanese-prose が 5 原則だけ** — チャット1ターン目から J1 J2 が読める。
2. **examples は参照** — モデルが長文ルールを毎回生成しなくてよい。必要なら `@docs/japanese-prose-examples.md`。
3. **consult はモード限定** — 通常の「D1 やって」には返答の順を強制しない。
4. **inventory で削除 0** — 旧条文は examples か consult に移しただけ。

## D2 以降（任意）

- review-implementation に「日本語は J1–J5 + examples」のチェック行（P-AG-07 候補）
- 自動 lint は日本語には効かないため、**人手レビュー**のみ
