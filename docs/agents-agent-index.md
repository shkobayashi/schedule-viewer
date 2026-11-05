# エージェント向け索引（地図・スキル・作業）

[AGENTS.md](../AGENTS.md) は **8 原則** のみ。ここに索引と運用メモを置く。

## 先に読む文書

質問に合う文書だけを読む。広く検索してからソースを開かない。

| 知りたいこと | 文書 |
| --- | --- |
| 利用者の操作 | [user-manual.md](user-manual.md)。手順は [getting-started](user-manual/getting-started.md)、[find-by-intent](user-manual/find-by-intent.md)、[tutorial](user-manual/tutorial.md)、[features](user-manual/features.md) |
| 操作の入口（内部表） | [operation-entries.md](operation-entries.md) |
| 画面と機能の挙動、機能 ID | [external-spec.md](external-spec.md) |
| 仕様を足すときの影響 | [feature-checklist.md](feature-checklist.md) |
| JSON とアプリデータ | [data-format.md](data-format.md)、`docs/*.schema.json` |
| 構成、Tauri、描画、層と import | [internal-spec.md](internal-spec.md)「コードの境界」（**詳細の正本**） |
| 循環 import と CI | [model-circular-import-plan.md](model-circular-import-plan.md) |
| テスト | [test-spec.md](test-spec.md) |
| 環境・CI・リリース | [development.md](development.md) |
| 1.x と next のブランチ | [development.md](development.md)（1.x を出しながら次のメジャーを進める） |
| 方針・ロードマップ | [PLANNING.md](PLANNING.md) |
| UI デザイン #449 | [design/benchmark.md](design/benchmark.md)、[inventory.md](design/inventory.md) |
| 同じ変更で揃える文書 | [agents-doc-update-map.md](agents-doc-update-map.md) |
| 事故例・implement-change 番号索引 | [agents-pitfall-examples.md](agents-pitfall-examples.md) |
| D0 棚卸し・old→new | [agents-d0-inventory.md](agents-d0-inventory.md)、[agents-d0-principles-analysis.md](agents-d0-principles-analysis.md) |
| D1 棚卸し | [agents-d1-inventory.md](agents-d1-inventory.md)、Issue 文案 [agents-d1-issue-490-proposal.md](agents-d1-issue-490-proposal.md) |
| D2 計画 | [agents-d2-plan.md](agents-d2-plan.md) |
| 概要 | [README.md](../README.md) |

## コードの境界（要約）

詳細・層の表・自動検査の列挙は [internal-spec.md](internal-spec.md) が正本。要約だけ:

- 依存: `App` / `components` → `operations`（操作 ID と入口定義）・`hooks`（実行と状態）→ `model`（純粋関数）。`model` は `hooks` / `components` / `operations` を import しない
- 循環 import: `npm run check:madge-circular-baseline`（CI **エラー**、現状 0 件）
- jscpd・coverage: 警告のみ（`check:architecture-warn`、`test:coverage-warn`）
- Issue #490 の段 8 作業指示（C/T/M 順、#491 を混ぜない、D0–D2）: [PLANNING.md](PLANNING.md) / Issue #490 / [model-circular-import-plan.md](model-circular-import-plan.md) — **恒久原則ではない**

## スキルとルール

計画には読むスキル名と節を書く。名指しが無いときは `description` が合うスキルを 1 つ。`implement-change` は指定節 + 常に「着手前」。

| 用途 | スキル |
| --- | --- |
| アプリ実装・文書・テスト | [implement-change](../.cursor/skills/implement-change/SKILL.md) |
| リリース・CI・配布 | [cut-release](../.cursor/skills/cut-release/SKILL.md) |
| 操作マニュアル Pages | [publish-user-manual](../.cursor/skills/publish-user-manual/SKILL.md) |
| 全体レビュー | [review-project](../.cursor/skills/review-project/SKILL.md) |
| 計画実装のレビュー | [review-implementation](../.cursor/skills/review-implementation/SKILL.md) |
| 起動中スケジュール相談 | [schedule-talk](../.cursor/skills/schedule-talk/SKILL.md) |
| `/consult` 相談モード | [consult](../.cursor/skills/consult/SKILL.md) + [consult.mdc](../.cursor/rules/consult.mdc) |
| 起動中の相談・試し計画（Issue #490 #344） | [schedule-talk/references/consultation-flow.md](../.cursor/skills/schedule-talk/references/consultation-flow.md) |
| 日本語（チャット含む） | [japanese-prose.mdc](../.cursor/rules/japanese-prose.mdc) **J1–J5**、[japanese-prose-examples.md](japanese-prose-examples.md)、[分析](japanese-prose-principles-analysis.md) |
| スケジュール JSON | write-schedule（他リポジトリ可） |
| メンバー / カレンダー / 色 / workspace / 拡張項目 | write-members, write-calendar, write-colors, write-workspace, write-fields |
| スケジュール schema | [update-schedule-schema](../.cursor/skills/update-schedule-schema/SKILL.md) |

1.x を出しながら next を進める手順は development のみ（専用スキルは作らない）。`next` 切りと次メジャーリリースは cut-release「1.x と次のメジャー」。スキルリンクは SKILL から `../../../AGENTS.md` のように相対パス。

スキルの分割・更新はエージェントが同じ作業で行う。半分以上の節が不要なら種類別スキルへ分ける（スキーマ変更は update-schedule-schema のまま）。毎回 2 つの実装スキルを読む計画になっているときは 1 つに戻す。

レビュー指摘を直すとき、再発防止は該当 SKILL 節へ同じ変更で必ず足す（review-implementation）。計画だけの指摘は足さない。`write-*` へアプリ実装手順を書かない。

日本語: [japanese-prose.mdc](../.cursor/rules/japanese-prose.mdc)（J1–J5、**チャット含む**）と [japanese-prose-examples.md](japanese-prose-examples.md)。相談: [consult.mdc](../.cursor/rules/consult.mdc) + [consult/SKILL.md](../.cursor/skills/consult/SKILL.md)

## 作業の進め方

- GitHub Issue は gh を使う
- 個人の好みとマシン固有の事実は `.cursor/rules/personal.local.mdc`（Git 外）。`AGENTS.md` に Learned User Preferences / Workspace Facts を足さない。実行状態は `.cursor/hooks/state/`
- デスクトップ: `npm run tauri dev`（[development.md](development.md)）。`src-tauri/target/debug/schedule-viewer` を直接開かない。UI は `http://localhost:1420/`。`schedule-viewer --mcp` は画面プロセスと別
- Cloud Agent: **マージ済み PR の head ブランチへ push しない**（続きは新ブランチ・新 PR）。amend / force-push / rebase 禁止 — [development.md](development.md)「Cursor Cloud Agent」（P-AG-03）
- 文書を短くするとき: [agents-d0-inventory.md](agents-d0-inventory.md) の old→new（**削除 0**）。D0–D2: Issue #490。**D0** = 原則化 + inventory。**D1** = skills 再構成 + 日本語 J1–J5。**D2** = [agents-d2-inventory.md](agents-d2-inventory.md)（ガード）。**D2 後 TODO:** d0 分析+inventory 統合 → [agents-d2-plan.md](agents-d2-plan.md)。届け方: `feature-436` → `next`；共通ルールは必要なら `develop` へ cherry-pick
