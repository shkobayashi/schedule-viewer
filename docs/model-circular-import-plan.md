# model 循環 import のベースラインと解消順（Issue #490）

段 8 の **M0** で madge の結果を固定する。**挙動は変えない**。各解消 PR は import の向きと型の置き場所だけを変える。

## 計測方法

| 項目 | 値 |
| --- | --- |
| コマンド | `npx madge --circular --extensions ts,tsx src` |
| CI での失敗 | `npm run check:madge-circular-baseline`（madge の結果を [scripts/madge-circular-baseline.json](../scripts/madge-circular-baseline.json) と照合。**1 件でも循環が増えたら CI が失敗**。`cycleCount: 0` と `cycles: []` が正本） |
| 正本 JSON | [scripts/madge-circular-baseline.json](../scripts/madge-circular-baseline.json)（解消履歴は `resolutionPlan`） |

M0 時点の **循環数は 30** である。M1 後 **17**、M2 後 **15**、M3a 後 **4**、M3b 後 **2**、UI 解消 PR 後 **1**、**hooks 解消 PR 後** **0**（Issue #490 段 8 の循環解消完了）。madge の表示順と JSON の `cycles` は、パスを ` > ` でつないだ文字列を辞書順に並べたものである。`cycles` が空配列のときは循環 0 件である。

## 解消順（M1 → M2 → M3）

Issue #490 の順序を変えない。**M3 は `validateSchedule` ハブを最後**にまとめる。

### M1（9 環）— 完了

葉に近い model クラスタ。2026-11-05 の M1 PR で解消済み。型・小モジュールの切り出しのみ（`baselineDiffsClassification`、`documentSnapshot`、`excelExportTypes`、`explainOverlayTypes`、`explainOverlayTrialVisible`、`outlineTaskMap` 等）。

| 塊 | 解消内容 |
| --- | --- |
| `baselineDiffs*` | 分類ラベル型を `baselineDiffsClassification.ts` へ |
| `explainOverlay*` / `mcpVisible` | 共有型と試し行判定を `explainOverlayTypes` / `explainOverlayTrialVisible` へ |
| Excel 書き出し | `ExcelExportShape` を `excelExportTypes.ts` へ |
| 履歴と serialize | `DocumentSnapshot` を `documentSnapshot.ts` へ |
| タスク TODO の短い環 | `mapAllTasksInOutline` を `outlineTaskMap.ts` へ |

### M2（2 環）— 完了

2026-11-05 の M2 PR で解消済み。

| 環 | 対応 |
| --- | --- |
| `fieldFilters` ↔ `types` | 条件型を `fieldFiltersTypes.ts` へ。`types` はそこから `FieldFiltersState` を参照 |
| `palette` ↔ `design/uiTokens` | `ResolvedColorScheme` を `resolvedColorScheme.ts` へ |

### M3（`validateSchedule` ハブ）— 分割

Issue #490 では M3 を最後にまとめる。**変更量に応じて PR を分ける**。

#### M3a — 完了

2026-11-05 の M3a PR。`taskRef.ts`（`TaskRef` 型）と `taskTraversal.ts`（`forEachTask` / `mapTasks`）。`hierarchy` が `dependencies` を import しないようにし、`taskTags` が `tasks` を import しないようにした。**13 環のうち 11 環を解消**（ベースライン **15 → 4**）。

#### M3b — 完了

2026-11-05 の M3b PR。`taskTodos.ts` の `mapTasks` を `taskTraversal` から import。`tasks.ts` の `formatValidationErrors` を `validationMessages` から import（`validateSchedule` 経由をやめる）。**model 2 環を解消**（ベースライン **4 → 2**）。

| 環 | 対応 |
| --- | --- |
| `taskTodos` → `tasks` | `mapTasks` を `taskTraversal` から import |
| `validateSchedule` → `taskTodos` → `tasks` | `tasks` が `formatValidationErrors` を `validationMessages` から直接 import |

**M3（model）完了**。**Issue #490 段 8 の madge 循環は 0 件**（`resolutionPlan` の M1–hooks すべて完了）。

## 段 8 で別扱い（M1–M3 とは別 PR）

| 塊 | 環数 | 内容 | 状態 |
| --- | ---: | --- | --- |
| **UI** | 1 → 0 | `components/Toolbar.tsx` ↔ `components/FilterPanel.tsx`。`AssigneeFilterOption` を [assigneeFilterOption.ts](../src/components/assigneeFilterOption.ts) へ | **完了** |
| **hooks** | 1 → 0 | `hooks/useScheduleFile.ts` ↔ `hooks/scheduleFile/useScheduleStartupRecovery.ts`。`ApplyOpenedFileOptions` を [applyOpenedFileOptions.ts](../src/hooks/scheduleFile/applyOpenedFileOptions.ts) へ | **完了** |

解消 PR ごとに madge を確認する。ベースライン JSON は、該当環が消えた PR でまとめて更新する。

## madge と CI

- **循環 import**は `npm run check:madge-circular-baseline` で **CI が失敗する**（`.github/workflows/ci.yml` の frontend で `check:mcp-tool-names` の直後）。`npm test` の node:test からも同じ照合を呼ぶ。実装は madge の JSON 出力をベースラインと比較する（ベースライン JSON を残す理由: 解消 PR で意図的に更新する正本と、`resolutionPlan` の履歴を一本化するため。件数 0 のときも、live と JSON の両方が空であることを確認する）。
- `check:architecture-warn` は **jscpd のみ**（警告のまま）。madge はここでは走らせない（二重実行をやめる）。
- 循環が **1 件でも増減**した PR では、必ず [scripts/madge-circular-baseline.json](../scripts/madge-circular-baseline.json) の `cycles`・`cycleCount`・`resolutionPlan` を **同じ PR で意図的に**更新する。
