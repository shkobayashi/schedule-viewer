---
name: implement-change
description: >-
  Implements a planned change in the schedule-viewer app and updates the
  matching docs and tests in the same change. Use when implementing or fixing
  screen behavior, state, the model, Tauri commands, or rendering from a plan,
  or when the plan names implement-change. Schedule, member, and calendar JSON
  authoring uses write-schedule, write-members, and write-calendar. Schedule
  JSON shape changes use update-schedule-schema.
---

# implement-change（schedule-viewer の実装）

計画に書かれた変更を、このリポジトリのアプリへ入れる。JSON を作る作業と、スキーマの形を変える作業は、このスキルの対象外である。

計画が節を指定しているときは、その節と「着手前」だけに従う。操作の文へ入口を足す変更でも、節の指定が「画面と操作」の 1 から 4 だけのときは、その 8 の動詞の掛かりを見る。

## 8 原則と条項

[AGENTS.md](../../../AGENTS.md) の **8 原則**と、条項番号の対応は [docs/agents-pitfall-examples.md](../../../docs/agents-pitfall-examples.md) の索引表を正とする。[画面と操作（条項 1–57）](references/screen.md) の条項は全文を残す（番号の欠番・黙って削除はしない）。

**再発防止:** 同じ失敗をテスト、lint、スキーマ検査、または既存の check の失敗で止められるときは、その検査を先に足す。スキルの文は、その検査では止められないときだけ足す。レビューで直したあとは、該当原則の例を [agents-pitfall-examples.md](../../../docs/agents-pitfall-examples.md) に短く足し、手順の全文は、下の「どの節を読むか」の表で当たる reference の**最も近い既存条項の直後**へ同じ変更で追記する（検査だけで足りるときはスキル本文を増やさない）。末尾にだけ「58.」を足して新ルール化しない。条項の並べ替えもしない。短くするときは [docs/agents-d0-inventory.md](../../../docs/agents-d0-inventory.md)（**削除 0**、§1・§6–§7）。

| 節 | 主に効く原則 |
| --- | --- |
| 着手前 | 2, 3, 8 |
| 画面と操作 | 1, 4, 5, 6, 7, 8 |
| 状態・モデル・描画・Tauri | 1, 2, 3, 5, 6, 8 |
| 文書 | 1, 4 |
| テストと確認 | 1, 2, 7 |
| 完了条件 | 1, 7, 8 |

## どの節を読むか

計画が節名を指定しているときは、下の表の **reference** を開いて読む。あわせて入口の [着手前](#着手前原則-2--3--8) も読む。指定が無いときは、触る層に合う reference だけを読む。reference を全部読む必要はない。loader が本文を結合して渡す、という読み方はしない。**完了条件**は、作業を終える直前に必ず入口で読む。

旧 SKILL の節見出しと、分割後の置き場所の対応は次のとおり。

| 節（計画・旧見出し） | 読むファイル | いつ読む |
| --- | --- | --- |
| 着手前 | 入口 [SKILL.md](SKILL.md)（本ファイル） | 実装を始める前（計画の指定に関係なく常に） |
| 画面と操作（旧は見出しなし、条項 1–57） | [references/screen.md](references/screen.md) | 画面・操作・表示・Konva・入口ラベルなど UI を変えるとき |
| 状態・モデル・描画・Tauri | [references/state.md](references/state.md) | `src/model/`、hooks、描画、Tauri、MCP 橋を変えるとき |
| 文書 | [references/docs.md](references/docs.md) | 仕様・マニュアル・CHANGELOG・更新表に触れるとき |
| テストと確認 | [references/tests.md](references/tests.md) | テスト・回帰表・検査の回し方を変えるとき |
| 完了条件 | 入口 [SKILL.md](SKILL.md)（本ファイル） | 完了宣言の直前（必須） |

## 着手前（原則 2 · 3 · 8）

0. [AGENTS.md](../../../AGENTS.md) の **8 原則** と [docs/agents-pitfall-examples.md](../../../docs/agents-pitfall-examples.md)。具体条項の全文は下の「どの節を読むか」の表が指す reference（削らない）
1. [docs/agents-agent-index.md](../../../docs/agents-agent-index.md) の「先に読む文書」で場所を絞ってからソースを開く
2. 機能 ID がある変更は、[docs/external-spec.md](../../../docs/external-spec.md) のその節に合わせる
3. 画面の組み立て、状態、モデル、Tauri、描画のどれを触るかを決める。層の向きと `src/operations/` の役割は [docs/internal-spec.md](../../../docs/internal-spec.md)「コードの境界」のみに従う（要約は [agents-agent-index.md](../../../docs/agents-agent-index.md)）。Rust は JSON の意味を解釈しない
4. 計画がスキルの節番号を列挙していても、計画本文の出し入れ、主語の掛かり、手動テストの各条件は照合する。照合結果は実装の結果に残す
5. `next` があるとき、変更を載せる統合ブランチは [docs/development.md](../../../docs/development.md#1x-を出しながら次のメジャーを進める) の「1.x を出しながら次のメジャーを進める」で決める。1.x のまま出せる変更は `develop`、公開する契約を壊す変更は `next` である。計画がブランチを書いていても、この節と照合し、結果は実装の結果に残す
6. 計画が操作の種類を列挙しているとき、チェックリストに足りない種類を「未対応」と書いて終えない。足すか、計画どおり実装する
7. 計画に無い依存と `tsconfig.json` の `compilerOptions.types` は、作業の基点ブランチでも同じ型エラーが出るなら、この変更には入れない
8. 循環解消やリファクタの PR では、計画に無いファイルの内容が丸ごと差し替わっていないか、差分のファイル一覧と変更量を見る。**ガード:** P-AG-04（[review-implementation](../review-implementation/SKILL.md)「差分の範囲」）（原則 1 · 4 · 5 · 6 · 7 · 8）

## 完了条件（原則 1 · 7 · 8）

- 計画が指定した範囲が入っている
- 対応する文書が同じ変更に含まれている
- その変更の場面に書いた検査が通っている
- 画面を変えたときは、操作を確認したか、確認できなかった箇所を結果に書いている
- 操作マニュアルの 19 図に写る見た目が変わる変更では、`docs/user-manual/images/` の PNG を撮影し直し、図を載せている getting-started または features の説明文も揃えている。計画が名指した図だけを撮り直すときも、撮影スクリプトが自分の子プロセスだけを止めるなら実行し、それ以外の PNG や無関係な生成物は元に戻す。撮影しなかったときは、図に写る見た目が変わらないことを結果に書く。撮影できなかったときは、理由を結果に書く。ポート 5173 か 5174 が他のプロセスで塞がっているときは、関係のないプロセスへシグナルを送らない
- レビューで計画と仕上がりがずれた箇所を直したときは、再発を防ぐ検査（テスト・lint・スキーマ・既存 check）を先に足す。検査では止められないときだけ該当 SKILL の最も近い既存条項の直後へ同じ変更で足す。足した検査または節を結果に書く。足さない判断だけを書いて完了にしない
