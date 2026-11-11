# エージェント向け指示

**地図と手順**は [docs/agents-agent-index.md](docs/agents-agent-index.md) と [docs/agents-doc-update-map.md](docs/agents-doc-update-map.md)（更新表の正本）。**具体の事故例**は [docs/agents-pitfall-examples.md](docs/agents-pitfall-examples.md) と [.cursor/skills/implement-change/SKILL.md](.cursor/skills/implement-change/SKILL.md)（番号付き全文。削らない）。

**正本の使い分け:** 質問に答える・場所を絞るときは文書を先に使う（広く検索してからソースを開かない）。**変更とレビュー**では、文書で場所を絞ったあとソースを開き、利用者に見える挙動はソースを正として、ずれた文書を同じ変更で直す。データ形の正本は `docs/*.schema.json`、層と import の正本は [docs/internal-spec.md](docs/internal-spec.md)「コードの境界」。

**新しい事故**が起きたときは、AGENTS に番号付きルールを増やない。該当する原則の下へ [agents-pitfall-examples.md](docs/agents-pitfall-examples.md) に例を足す。再発防止は、テスト・lint・スキーマ検査・既存 check で止められるならその検査を先に足し、足りないときだけ implement-change の該当条項へ同じ変更で足す（[review-implementation](.cursor/skills/review-implementation/SKILL.md)）。短くするときは [docs/agents-d0-inventory.md](docs/agents-d0-inventory.md)（**削除 0**、§1・§6–§7）。

分析と Issue #490 の作業記録: [docs/agents-d0-inventory.md](docs/agents-d0-inventory.md)（§分析・§1–§8）。

## 原則 1 — 同じ事実の写しは、同じ変更で揃える

**根本原因:** 操作ラベル、仕様、マニュアル、図、スキーマ、MCP 名、同梱リストなど一つの契約が多面にコピーされ、触った面だけ直して終わると世界が分かれる。

**ガード:** [agents-doc-update-map.md](docs/agents-doc-update-map.md)、`npm run check:schedule` / `check:calendar` / `check:members`、`check:mcp-tool-names`、`build:validate-skill`、`version:check`、Rust の read-screen 照合テスト、MSIX 必須 SKILL 一覧。**例:** [agents-pitfall-examples.md §1](docs/agents-pitfall-examples.md#原則-1--同じ事実の写し)。

## 原則 2 — 文書を地図にし、名指しは全部満たす。無いものは作らない

**根本原因:** 文書を飛ばしてソースを広く読む、または計画の条件を代表 1 件で済ませる、JSON で不足を推測で埋めると、頼まれていない省略・創作になる。

**ガード:** [agents-agent-index.md](docs/agents-agent-index.md) の文書表、implement-change「着手前」「テストと確認」、write-* の「不足なら書かない」、consult（`/consult` 時）。**例:** [§2](docs/agents-pitfall-examples.md#原則-2--文書と計画の名指し)。

## 原則 3 — 依存は一方向。共有の型と計算は葉へ出す

**根本原因:** 層違反と相互 import が改修を止め、UI ロジックが model に混ざる。型や共有関数を「一方の利用者」のファイルに置くと循環の典型になる。

**ガード:** `App` / `components` → `operations`（定義）・`hooks` → `model`（`model` は UI を import しない。実行は hooks）。`npm run lint`（import 境界）、`npm run check:madge-circular-baseline`（CI **エラー**、0 件。詳細 [model-circular-import-plan.md](docs/model-circular-import-plan.md)）。**例:** [§3](docs/agents-pitfall-examples.md#原則-3--依存と循環)。

## 原則 4 — 一つの操作は、すべての入口と説明文で同じ意味を保つ

**根本原因:** ☰・ショートカット・パレット・MCP・右クリックなどは同じ操作の別入口。一つだけ直すと他が古いまま。文書へ入口を挿入すると文末の動詞や「これら」がずれる。

**ガード:** [operation-entries.md](docs/operation-entries.md)、[feature-checklist.md](docs/feature-checklist.md)「操作の入口」、implement-change「画面と操作」、`npm run check:operation-entries`（P-CI-06）。**例:** [§4](docs/agents-pitfall-examples.md#原則-4--操作の入口)。

## 原則 5 — 「今の操作」の持ち主を取り違えない

**根本原因:** ポインタ capture、押下時点の選択、IME 変換中、非同期の世代、起動復旧のロックは「今画面の値」と別。取り違えると誤確定・古い結果が残る。

**ガード:** 段 8 特性テスト（例: `timelineDragCommit`）、DOM `*.test.tsx`、implement-change の Konva / 起動 / 世代の条項、review-implementation の非同期観点。**例:** [§5](docs/agents-pitfall-examples.md#原則-5--今の操作の持ち主)。

## 原則 6 — 座標・寸法・色・フォントは、一つの計算と一つのトークンから取る

**根本原因:** チャート・一覧・説明・MCP・PNG が同じ棒を別式で計算し、内容座標と表示座標、`scrollX`、パレット外の CSS が混ざる。

**ガード:** `palette.ts`、`fontStack.ts`、`--s`、`taskBarLayout.ts` / `explainOverlayLayout.ts` の戻り値一致テスト、implement-change 51–54（旧 51 分割。対応 [agents-implement-change-51-split.md](docs/agents-implement-change-51-split.md)）。**例:** [§6](docs/agents-pitfall-examples.md#原則-6--幾何とトークン)。

## 原則 7 — 確認は、間違った計算でも通らない入力で、条件ごとに残す

**根本原因:** 「テストを足した」だけでは計画の分岐を通ったことにならない。Konva・Tauri ダイアログ・IME は自動では見られない。誤った計算でも同じ期待値になる入力がある。

**ガード:** [test-spec.md](docs/test-spec.md)、`npm test`、review-implementation「テスト網羅性」、implement-change「テストと確認」。coverage は [vitest.config.ts](vitest.config.ts) の `coverage.thresholds` を下回ると CI が失敗する（上げ方と緩和時の記載は [development.md](docs/development.md)）。jscpd は警告のまま（上限は [scripts/check-architecture-warn.mjs](scripts/check-architecture-warn.mjs) の `--threshold`）。**例:** [§7](docs/agents-pitfall-examples.md#原則-7--テストと手動)。

## 原則 8 — スキルは作業種別の手順書。再発防止はスキルへ。持ち出し用にアプリ実装を混ぜない

**根本原因:** レビューをその場のパッチで終えると同じ省略が繰り返す。write-* へアプリ手順を書くと他リポジトリへ汚染する。短くして移動先を示さないと観点が消える。

**ガード:** [agents-agent-index.md](docs/agents-agent-index.md) のスキル表、review-implementation / implement-change 完了条件、`.cursor/rules/personal.local.mdc`（Git 外）、inventory の old→new。場面ごとに回す検査は、ルール（`.cursor/rules/when-to-run-tests.mdc`）、implement-change の「テストと確認」、`docs/development.md` の「場面ごとに回す検査」に同じ表がある。作業中は、その場面の行より多い検査を繰り返さない。日本語は [japanese-prose.mdc](.cursor/rules/japanese-prose.mdc) **J1–J5**（チャット含む）。**例:** [§8](docs/agents-pitfall-examples.md#原則-8--スキルと再発防止)。
