# model 循環 import のベースラインと解消順（Issue #490）

段 8 の **M0** で madge の結果を固定する。**挙動は変えない**。各解消 PR は import の向きと型の置き場所だけを変える。

## 計測方法

| 項目 | 値 |
| --- | --- |
| コマンド | `npx madge --circular --extensions ts,tsx src`（`npm run check:architecture-warn` も同じ madge 呼び出し） |
| 終了コード | 循環があると **1**（CI の architecture-warn は失敗してもジョブは続行） |
| ベースライン照合 | `npm run check:madge-circular-baseline`（`npm test` に含む。**不一致で失敗**） |
| 正本 JSON | [scripts/madge-circular-baseline.json](../scripts/madge-circular-baseline.json) |

M0 時点の **循環数は 30** である。madge の表示順と JSON の `cycles` は、パスを ` > ` でつないだ文字列を辞書順に並べたものである。

## 解消順（M1 → M2 → M3）

Issue #490 の順序を変えない。**M3 は `validateSchedule` ハブを最後**にまとめる。

### M1（9 環）

葉に近い model クラスタ。検証ハブに依存しない、または短い環だけを先に切る。

| 塊 | 環数 | 代表 |
| --- | ---: | --- |
| `baselineDiffs*` | 2 | `baselineDiffs.ts` ↔ `baselineDiffsConnections` / `baselineDiffsOutline` |
| `explainOverlay*` | 3 | `explainOverlay.ts` ↔ `explainOverlayLayout` / `explainOverlayPatterns` ↔ `mcpVisible` |
| Excel 書き出し | 1 | `exportExcel.ts` ↔ `excelSummaryBar.ts` |
| 履歴と serialize | 2 | `history.ts` ↔ `serialize.ts`（`hierarchyLevelEdit` 経由を含む） |
| タスク TODO の短い環 | 1 | `taskTodos.ts` ↔ `outlineTasks.ts`（`validateSchedule` を経由しない環） |

完了条件: 上記 9 環が madge から消え、ベースライン JSON を **意図的に**更新する PR で件数が減ること。全 model テスト通過。

### M2（2 環）

デザイントークンと型の相互参照。

| 環 | 内容 |
| --- | --- |
| 1 | `model/palette.ts` ↔ `design/uiTokens.ts` |
| 2 | `model/fieldFilters.ts` ↔ `model/types.ts` |

完了条件: 2 環が 0。同上。

### M3（17 環）

`validateSchedule.ts` を中心としたクラスタ（`hierarchy`、`dependencies`、`tasks`、`scheduleSemantics`、`assigneeIds`、`connections`、`taskFields`、`taskTodos`、`outlineTasks`、`validationMessages`、`taskTags`、`timeline` への経路を含む）。

完了条件: model 向け madge 循環が 0、または許容リストのみ。全テスト通過。**ハブの層分割はこの段だけ**で行う。

## 段 8 で別扱い（M1–M3 とは別 PR）

| 塊 | 環数 | 内容 |
| --- | ---: | --- |
| **UI** | 1 | `components/Toolbar.tsx` ↔ `components/FilterPanel.tsx` |
| **hooks** | 1 | `hooks/useScheduleFile.ts` ↔ `hooks/scheduleFile/useScheduleStartupRecovery.ts` |

解消 PR ごとに madge を確認する。ベースライン JSON は、該当環が消えた PR でまとめて更新する。

## madge と CI

- `check:architecture-warn` は **警告のまま**（ratchet しない、エラー化しない）。
- ベースライン固定は `check:madge-circular-baseline` のみが担う。循環を解消した PR では JSON の `cycles` と `resolutionPlan` を同じ変更で更新する。
