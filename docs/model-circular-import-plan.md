# model 循環 import のベースラインと解消順（Issue #490）

段 8 の **M0** で madge の結果を固定する。**挙動は変えない**。各解消 PR は import の向きと型の置き場所だけを変える。

## 計測方法

| 項目 | 値 |
| --- | --- |
| コマンド | `npx madge --circular --extensions ts,tsx src`（`npm run check:architecture-warn` も同じ madge 呼び出し） |
| 終了コード | 循環があると **1**（CI の architecture-warn は失敗してもジョブは続行） |
| ベースライン照合 | `npm run check:madge-circular-baseline`（**CI frontend で必須**。`npm test` の node:test からも呼ぶ。**不一致で失敗**） |
| 正本 JSON | [scripts/madge-circular-baseline.json](../scripts/madge-circular-baseline.json) |

M0 時点の **循環数は 30** である。M1 完了後は **17**、M2 完了後は **15** である（ベースライン JSON を更新済み）。madge の表示順と JSON の `cycles` は、パスを ` > ` でつないだ文字列を辞書順に並べたものである。

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

### M3（残り 13 環、ベースライン JSON 参照）— 未着手

`validateSchedule.ts` を中心としたクラスタ（M1 後は `outlineTaskMap` 経路を含む。`hierarchy`、`dependencies`、`tasks`、`scheduleSemantics` 等）。

完了条件: model 向け madge 循環が 0、または許容リストのみ。全テスト通過。**ハブの層分割はこの段だけ**で行う。

## 段 8 で別扱い（M1–M3 とは別 PR）

| 塊 | 環数 | 内容 |
| --- | ---: | --- |
| **UI** | 1 | `components/Toolbar.tsx` ↔ `components/FilterPanel.tsx` |
| **hooks** | 1 | `hooks/useScheduleFile.ts` ↔ `hooks/scheduleFile/useScheduleStartupRecovery.ts` |

解消 PR ごとに madge を確認する。ベースライン JSON は、該当環が消えた PR でまとめて更新する。

## madge と CI

- `check:architecture-warn` は **警告のまま**（ratchet しない、エラー化しない）。madge 自体の終了コード 1 でも CI ジョブは止めない。
- **ベースライン一致**は `npm run check:madge-circular-baseline` で **CI frontend ジョブが必須**（`.github/workflows/ci.yml` で `check:mcp-tool-names` の直後）。ローカルでも同コマンドで確認する。
- 循環が **1 件でも増減**した PR（M1–M3 の解消、UI / hooks の解消、意図的な再計測を含む）は、必ず [scripts/madge-circular-baseline.json](../scripts/madge-circular-baseline.json) の `cycles`・`cycleCount`・`resolutionPlan` を **同じ PR で意図的に**更新する。黙って drift させない。
