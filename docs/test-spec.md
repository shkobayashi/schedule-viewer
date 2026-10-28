# テスト仕様

何を自動で確かめ、何を手で確かめるかを定める。機能 ID は [外部仕様](external-spec.md#機能) のものである。テスト名は、各 `src/model/*.test.ts` の `it` と、`src-tauri/src/lib.rs`、`src-tauri/src/recent_files.rs`、`src-tauri/src/json_skills.rs`、`src-tauri/src/mcp_app_data.rs`、`src-tauri/src/mcp_stdio.rs`、`src-tauri/src/schedule_drop.rs`、および Windows では `src-tauri/src/mcp_bridge_windows.rs` の `#[test]` の名前である。

## 方針

自動テストの対象は、`src/model/` の純粋関数と、Rust 側のパス検査である。画面操作、Konva の描画、Tauri のダイアログ、ファイルの監視、配布物は、手で確かめる。

どの機能 ID も、自動テストか下の手動テストケースの少なくとも一方に対応づける。

## テストの種類と実行方法

リポジトリ直下で実行する。Node.js 24 が必要である。Rust のテストには 1.98.1 と、[開発ガイド](development.md#ubuntu) のシステムパッケージも要る。

| 種類 | コマンド | 見ているもの |
| --- | --- | --- |
| Vitest | `npm test` | `src/**/*.test.ts`。環境は Node。先に検証器を生成する |
| Rust | `cd src-tauri && cargo test --locked` | `lib.rs`、`json_skills.rs`、MCP 関連のパスとフレーム検査 |
| ESLint | `npm run lint` | `src` と `scripts` の TypeScript。`dist`、`src-tauri`、`mockup`、`.cursor` は対象外 |
| 型検査 | `npm run build` の中の `tsc` | `src` |
| Clippy | `cd src-tauri && cargo clippy -- -D warnings` | Rust。警告をエラーにする |
| スケジュール検証 | `npm run check:schedule` | 引数なしなら `src/sample/schedule.ts` |
| カレンダー検証 | `npm run check:calendar` | 引数なしなら `examples/jp-2026.calendar.json` |
| メンバー検証 | `npm run check:members` | 引数なしなら `examples/playground.members.json` |
| バージョン | `npm run version:check` | 5ファイルのバージョン番号と `X.Y.Z` / `X.Y.Z-beta.N` の形、`tauri.conf.json` の `plugins.updater.endpoints` がそのメジャー用 `updater-X` を指すこと |
| スキル同梱物 | `npm run build:validate-skill` のあと、CI と同じパスで `git diff --exit-code` | スキーマコピーと検証 bundle の差分 |

画面用のテストランナー（jsdom、Testing Library、Playwright）は入っていない。

## CI での実行

| ワークフロー | きっかけ | 実行するもの |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `develop`、`main`、`next` 向けの pull request | 変更パスがフロントなら `version:check`、`build`、`lint`、`test`、`check:schedule`、`check:calendar`、`check:members`、`build:validate-skill`、`npm audit --audit-level=high`、スキル同梱物の差分。Rust なら `npm ci` のあと `version:check`、Ubuntu と Windows で Clippy と `cargo test --locked`。操作マニュアルのサイト入力なら `npm ci` のあと `build:manual-site`。最後に集約ジョブ `ci` が成功する |
| `.github/workflows/pages.yml` | `main` への push（操作マニュアルとサイトビルドの入力）または `workflow_dispatch` | `npm ci` のあと `build:manual-site` を GitHub Pages へ公開する |
| `.github/workflows/release.yml` | `main` または `release/**` への push | 版、ブランチ、タグの検査のあと、環境 `release` の承認のあと、更新用署名付きの Ubuntu deb と Apple Silicon の dmg を GitHub Release へ出す。安定版では Windows が署名しない MSIX を Microsoft Store（`9PP41TRJ8ZT8`）へ提出する。ベータでは Windows NSIS と `schedule-viewer-codesign.cer` と `latest-windows-x86_64.json` を出す。`latest-linux-x86_64.json`、`latest-darwin-aarch64.json` と、安定版では `linux-x86_64` と `darwin-aarch64` の `latest.json`、ベータでは `windows-x86_64` も含む `latest.json`、`SHA256SUMS` を載せる。安定版の `checksums` は deb と dmg の成功を待ち、Store 提出の成否では止まらない。`main` は安定版で CHANGELOG から本文を組み立てる。安定版ではビルド前に GitHub Release を作り、`checksums` が同じメジャー用の Pre-release `updater-X` の `latest.json` を更新し、より大きいメジャーが無いときだけ Latest を付ける。`release/X.Y.Z` は Pre-release で短い確認用の本文 |

`develop` への push だけでは CI は動かない。`docs/*.md` だけの変更（操作マニュアル以外）ではフロントと Rust と `manual` はスキップするが、集約ジョブ `ci` は成功する。詳細は [開発ガイド](development.md#ブランチと-ci) にある。

## 自動テスト一覧

### Vitest

| ファイル | ケース | 機能 ID |
| --- | --- | --- |
| `catalogMismatch.test.ts` | `reports status only when a task has an id missing from the catalog` | VIEW-13 |
| 同上 | `reports assignee only when a task has an id missing from the member catalog` | VIEW-13 |
| 同上 | `reports both when status and assignee are missing from their catalogs` | VIEW-13 |
| 同上 | `does not treat unassigned assignee as a mismatch` | VIEW-13 |
| 同上 | `treats any assignee id as unknown when no catalog is selected` | VIEW-13 |
| 同上 | `returns null when every status and assignee resolves` | VIEW-13 |
| 同上 | `reports unknown field values` | VIEW-13 |
| 同上 | `scans the whole task list, not only tasks that would pass a filter` | VIEW-13 |
| `statusDisplay.test.ts` | `uses at least three characters and caps at eight` | VIEW-13 |
| 同上 | `shows the display name for a known id` | VIEW-13 |
| 同上 | `shows the raw id for an unknown id` | VIEW-13 |
| `viewPreferences.test.ts` | `treats a missing status key as off` | SET-01, VIEW-13 |
| 同上 | `reads status when explicitly true` | SET-01, VIEW-13 |
| `assigneeDisplay.test.ts` | `keeps empty as unassigned` | VIEW-10 |
| 同上 | `resolves a known id to text label` | VIEW-10 |
| 同上 | `marks ids missing from the catalog as allUnknown` | VIEW-10 |
| 同上 | `joins multiple assignees with読点` | VIEW-10 |
| 同上 | `uses allUnknown badge only when every id is unknown` | VIEW-10 |
| 同上 | `keeps empty and unknown-only, and drops resolved members` | FILTER-03 |
| 同上 | `matches when id is in the list` | FILTER-03 |
| 同上 | `appends the id only when the display name is duplicated` | VIEW-10 |
| 同上 | `matches bar-right label for empty assignees` / `joins all assignees in order with読点` / `appends id only for duplicate display names and marks unknown ids` / `does not truncate long labels` | EXPORT-05 |
| `assigneeIds.test.ts` | `maps null, string, and array` / `serializes empty, one, and many` / `compares order` / 重複拒否 / 正規化 / `validateSchedule assigneeId json` / `accepts unassigned tasks after documentToJson for baseline merge validation` | FILE-01, FILE-02, SYNC-01 |
| `rows.test.ts` | `taskMatchesFilter assignee` | FILTER-03 |
| `scheduleDiff.test.ts` | `shows ordered assigneeId for multiple ids and order-only changes` | FILE-07 |
| `baselineDiffs.test.ts` | `classifies assignee order mismatch as 異なる without merging ids` | FILE-07 |
| `bulkTaskEdit.test.ts` | `replaces assigneeIds on all selected tasks including empty` / `applyBulkTaskEditOutline assigneeIds` / `sets and clears colorId on selected tasks only` | EDIT-04 |
| `taskColorId.test.ts` | `applyTaskColorId` | EDIT-04, EDIT-14, VIEW-14 |
| `tasks.test.ts` | `categoriesAfterTaskEdit colorId` / duplicate `uses patch colorId` / `clears colorId when patch sets null` | EDIT-04, EDIT-14 |
| `calendarAppData.test.ts` | `stores imported JSON and reads it back` | SET-03 |
| 同上 | `clears calendar on delete` | SET-03 |
| 同上 | `drops a label when the body is missing` | SET-03 |
| 同上 | `keeps a label and reports an error when the body is invalid` | SET-03 |
| 同上 | `uses a fallback label when the body has no display name` | SET-03 |
| 同上 | `rolls back both keys when the label cannot be stored` | SET-03 |
| `dates.test.ts` | `steps across US DST end without losing a calendar day` | — |
| 同上 | `supports fractional days for timeline dragging` | EDIT-02 |
| 同上 | `includes the left edge of a day and excludes the next left edge` | EDIT-07, EDIT-11 |
| 同上 | `uses the day under a scrolled pointer` | EDIT-07, EDIT-11 |
| 同上 | `keeps the left edge when a day width does not divide evenly` | EDIT-07, EDIT-11 |
| 同上 | `returns null outside the timeline and when a day has no width` | EDIT-07, EDIT-11 |
| 同上 | `formats UTC calendar date` | VIEW-07 |
| `dragDates.test.ts` | `places both dates above the ends when the bar is long enough` | EDIT-02, EDIT-03 |
| 同上 | `separates the chips when the bar is shorter than the labels` | EDIT-02, EDIT-03 |
| 同上 | `shifts a chip inward when the end is at the screen edge` | EDIT-02 |
| 同上 | `moves dates off the bar when the row is at the top of the chart` | EDIT-02 |
| 同上 | `keeps chips off the handle padding` | EDIT-03 |
| 同上 | `avoids another bar when a clear slot exists` | EDIT-02 |
| 同上 | `sizes the date chip from the display font, not the timeline zoom` | EDIT-02 |
| 同上 | `moves start and end by the same rounded day count` | EDIT-02 |
| 同上 | `snaps a resized end to the inclusive day and stops at the start` | EDIT-03 |
| 同上 | `stops a resized start from passing the end` | EDIT-03 |
| 同上 | `recolors only the link touched by the dragged task` | VIEW-08, EDIT-02 |
| 同上 | `uses the successor start when that task is dragged` | VIEW-08 |
| 同上 | `returns a preview per selected visible task` | EDIT-02 |
| 同上 | `recolors when either endpoint is in the override map` | VIEW-08, EDIT-02 |
| `taskSelection.test.ts` | `selects a range with shift+click` | EDIT-01 |
| 同上 | `toggles with meta+click` | EDIT-01 |
| 同上 | `does not toggle with ctrl+click on Mac` | EDIT-01 |
| 同上 | `shrinks range when extending back with shift+arrow` | EDIT-01 |
| 同上 | `extends selection with shift+arrow` | EDIT-01 |
| `bulkTaskEdit.test.ts` | `returns null when two tasks are selected` | EDIT-01, EDIT-04 |
| `bulkTaskEdit.test.ts` | `applies status to all selected tasks` | EDIT-04 |
| 同上 | `rejects when end is before start for any task` | EDIT-04 |
| 同上 | `rejects draft with end before start using the first task name` | EDIT-04 |
| 同上 | `skips existing predecessor links` | EDIT-04, EDIT-05 |
| 同上 | `rejects when all tasks already have the tag` | EDIT-04 |
| 同上 | `adds tag only to tasks that do not have it` | EDIT-04 |
| 同上 | `rejects a cycle for the whole apply` | EDIT-04, EDIT-05 |
| `appKeyboard.test.ts` | `shifts dates when multiple tasks are selected without a primary id` | EDIT-03, EDIT-04 |
| 同上 | `deletes when multiple tasks are selected` | EDIT-01, EDIT-09 |
| `dependencies.test.ts` | `keeps a right elbow when the gap fits the arrow` | VIEW-08 |
| 同上 | `approaches from the left when the gap is shorter than the arrow` | VIEW-08 |
| 同上 | `routes around a bar that starts before the predecessor ends` | VIEW-08 |
| 同上 | `hits the segment, the elbow, and the endpoint` | EDIT-12 |
| 同上 | `picks the closer line and ignores points outside the threshold` | EDIT-12 |
| 同上 | `appends the predecessor in one list` | EDIT-12 |
| 同上 | `rejects a duplicate with the same message as a repeated predecessor id` | EDIT-12 |
| 同上 | `rejects a cycle with the edit dialog message` | EDIT-12, EDIT-05 |
| 同上 | `removes only that predecessor id` | EDIT-12 |
| 同上 | `links outline tasks when both ends are visible` | EXPORT-02 |
| 同上 | `omits links when a task is not visible` | EXPORT-02 |
| `monthHeader.test.ts` | `formats year and month in Japanese` | NAV-02 |
| 同上 | `shows distant month labels` | NAV-02 |
| 同上 | `hides a month label that overlaps a fixed label` | NAV-02 |
| 同上 | `shows a month label that clears the fixed label with gap` | NAV-02 |
| 同上 | `does not treat a skipped month as obstruction for the next month` | NAV-02 |
| 同上 | `scales the gap with display size` | NAV-02 |
| 同上 | `estimates width from each label font size` | NAV-02 |
| 同上 | `hides the next label when the previous label uses a larger font size` | NAV-02 |
| `excelTimeColumns.ts`（`exportExcel.test.ts` 経由） | `builds day columns for each day in the span` | EXPORT-05 |
| `excelBar.test.ts` | `scales bar width with date column width` | EXPORT-05 |
| 同上 | `centers bar vertically from body row height only` | EXPORT-05 |
| 同上 | `uses solid fill for committed tasks` | EXPORT-05 |
| 同上 | `uses hatch foreground for tentative tasks` | EXPORT-05 |
| 同上 | `changes fill with status, overdue, and color scheme` | EXPORT-05 |
| 同上 | `does not change fill when only dates change` | EXPORT-05 |
| `excelConnector.test.ts` | `uses straight connector on the same row` | EXPORT-05 |
| 同上 | `picks stroke color from broken flag only` | EXPORT-05 |
| 同上 | `places bent elbow 12px from the predecessor when the gap is wide enough` | EXPORT-05 |
| 同上 | `places bent elbow at the midpoint when the gap is narrower than 12px` | EXPORT-05 |
| 同上 | `descriptor uses straight geometry on the same row` | EXPORT-05 |
| 同上 | `descriptor uses bent geometry across rows` | EXPORT-05 |
| `excelLightning.test.ts` | `returns null when the lightning line is off` | EXPORT-05 |
| 同上 | `returns null when today is outside the timeline` | EXPORT-05 |
| 同上 | `returns null when there are no body rows` | EXPORT-05 |
| 同上 | `places today line on the today column with lightning color` | EXPORT-05 |
| 同上 | `scales height with body row count and row height only` | EXPORT-05 |
| `excelLayout.test.ts` | `uses 28px header when date columns are 96px or wider` | EXPORT-05 |
| 同上 | `uses 22px header when date columns are narrower than 96px` | EXPORT-05 |
| `excelMilestone.test.ts` | `puts group name and diamond column` | EXPORT-05 |
| 同上 | `joins same-day milestones in one cell` | EXPORT-05 |
| 同上 | `keeps same-day milestone names in document order` | EXPORT-05 |
| `excelDateColumnBorder.test.ts` | `uses one light border color for all tiers` | EXPORT-05 |
| `excelSummaryBar.test.ts` | `splits covered spans and adds gap lines between them` | EXPORT-05 |
| `exportExcel.test.ts` | `spans a task bar across start and end day columns in day view` | EXPORT-05 |
| 同上 | `puts visible task rows and shapes into the payload` | EXPORT-02, EXPORT-05 |
| 同上 | `uses 28px header and 22px body rows for month export columns` | EXPORT-05 |
| 同上 | `offsets bars within equal-width month columns` | EXPORT-05 |
| 同上 | `puts dependency connectors and today line into the payload` | EXPORT-05 |
| 同上 | `assigns name indent and summary decorations by row kind` | EXPORT-05 |
| 同上 | `uses black task names and group-row gray for holidays` | EXPORT-05 |
| 同上 | `includes row fill rgb for colored tasks` | VIEW-14, EXPORT-05 |
| 同上 | `uses light group and overdue name colors on a white sheet` | EXPORT-05 |
| 同上 | `uses milestone group name on milestone rows` | EXPORT-05 |
| 同上 | `keeps task indent 0 for task-only visible rows` | EXPORT-05 |
| 同上 | `indents two-level hierarchy like top heading and task` | EXPORT-05 |
| 同上 | `indents five-level hierarchy through depth 4 on tasks` | EXPORT-05 |
| 同上 | `matches legacy category group task indents for three-level outline headings` | EXPORT-05 |
| `excelExportColumns.test.ts` | `uses default columns when storage is empty` | EXPORT-01, EXPORT-05 |
| 同上 | `parses stored preferences` | EXPORT-01, EXPORT-05 |
| 同上 | `defaults field columns to off`、`inserts enabled field columns before note`、`disambiguates duplicate names only among enabled field columns` | EXPORT-01, EXPORT-05 |
| `exportExcel.test.ts` | `leaves field columns off by default`、`formats enabled field columns before note` | EXPORT-05 |
| 同上 | `puts full assignee text in one column for tasks and leaves headings empty` | EXPORT-05 |
| 同上 | `does not add assignee cells on milestone rows when the column is on` | EXPORT-05 |
| `baselineDiffs.test.ts` | `classifies same key with number on screen and string on file as 異なる`、`keeps unchanged field values when merging a file-only field change` | SYNC-01, FILE-07 |
| `baselineMergeReview.test.ts` | `orders extension fields by definition in change blocks`、`orders extension fields by definition under conflict headlines` | SYNC-01, FILE-07 |
| `exportHtml.test.ts` | `puts the active filter into HTML and SVG`、`omits fieldValues from HTML and SVG export` | EXPORT-01, EXPORT-02 |
| 同上 | `escapes font-family in SVG attributes but not in HTML CSS` | EXPORT-01 |
| 同上 | `omits overlapping month header labels in month export but keeps grid lines` | NAV-02, EXPORT-02 |
| 同上 | `hatches tentative bars and labels them, and leaves committed bars solid` | VIEW-12, EXPORT-01 |
| 同上 | `hatches a tentative milestone and leaves a committed one solid` | VIEW-04, VIEW-12, EXPORT-01 |
| 同上 | `fills hierarchy chart rows like the sidebar` | EXPORT-02, VIEW-01 |
| `exportView.test.ts` | `keeps milestones inside the visible span and referenced ones outside it` | EXPORT-02 |
| 同上 | `keeps only the selected milestone` | EXPORT-02 |
| 同上 | `drops milestones when the filter is none` | EXPORT-02 |
| 同上 | `spans the visible tasks and exported milestones, not hidden dates` | EXPORT-02 |
| 同上 | `returns empty text when every filter is the default` | EXPORT-02 |
| 同上 | `lists only the filters that are on` | EXPORT-02 |
| `history.test.ts` | `does not push identical content` | EDIT-10 |
| 同上 | `treats a whitespace-only note as the same content` | EDIT-10 |
| 同上 | `drops the oldest entry after 100 steps` | EDIT-10 |
| 同上 | `undo and redo restore the document` | EDIT-10 |
| 同上 | `clears the redo stack after a new edit` | EDIT-10 |
| `statusesMigrate.test.ts` | `maps built-in ids before closed` | SET-08 |
| 同上 | `maps other ids from closed` | SET-08 |
| 同上 | `migrates schemaVersion 1 documents` | SET-08 |
| 同上 | `accepts v1 and returns v2 roles` | SET-08 |
| 同上 | `rejects v2 with closed` | SET-08 |
| `statusCatalog.test.ts` | `keeps the ids and roles of the old three values` | SET-08, VIEW-02 |
| 同上 | `validates as a statuses document` | SET-08 |
| 同上 | `shows the id of an unknown status and treats it as neutral` | SET-08, VIEW-02 |
| 同上 | `reads done from the item role` | VIEW-05 |
| 同上 | `picks not-started as the default, else the first non-done item` | SET-08 |
| 同上 | `picks the label color with the higher contrast` | VIEW-02 |
| 同上 | `marks only not-started and started overdue after end` | VIEW-05 |
| 同上 | `does not mark a task ending today overdue` | VIEW-05 |
| 同上 | `keeps the status fill when overdue and only reddens the border` | VIEW-05 |
| 同上 | `chooses a readable label color from the fill` | VIEW-02 |
| 同上 | `folds by role and period` | VIEW-07 |
| 同上 | `keeps unknown ids at today in every period` | VIEW-07 |
| 同上 | `ignores progress` | VIEW-07 |
| 同上 | `folds started tasks with a future start to the start date` | VIEW-07 |
| 同上 | `does not place lightning past end when end is today` | VIEW-07 |
| 同上 | `drops only done items for not-done` | FILTER-04 |
| 同上 | `matches one id exactly, including ids added to the list` | FILTER-04 |
| 同上 | `relaxes a status filter that hides a new task` | FILTER-04 |
| 同上 | `computes visible rows with the catalog` | FILTER-04 |
| 同上 | `rejects a duplicate id` | SET-08 |
| 同上 | `rejects a color that is not a 6 digit hex value` | SET-08 |
| 同上 | `rejects an empty list and a missing description` | SET-08 |
| `statusEdit.test.ts` | `adds an item whose id does not collide` | SET-08 |
| 同上 | `updates one item and keeps the other color scheme` | SET-08 |
| 同上 | `moves an item and ignores moves past either end` | SET-08 |
| 同上 | `never removes the last item` | SET-08 |
| 同上 | `picks a free catalog id` | SET-08 |
| 同上 | `writes JSON that validates` | SET-08 |
| 同上 | `reports a blank name and a duplicate id` | SET-08 |
| `statusCatalogEditHistory.test.ts` | `undoes one character at a time` | SET-08 |
| 同上 | `coalesces identical snapshots` | SET-08 |
| 同上 | `undoes a role change in one step` | SET-08 |
| 同上 | `clears redo after a new edit` | SET-08 |
| 同上 | `drops the oldest entry past the max` | SET-08 |
| 同上 | `restores selection when undoing a delete` | SET-08 |
| 同上 | `redoes after undo` | SET-08 |
| `statusCatalogEditSession.test.ts` | `closes when the open catalog is removed` | SET-08 |
| 同上 | `reloads when another window overwrites the open catalog` | SET-08 |
| 同上 | `ignores self save reload` | SET-08 |
| 同上 | `skips reload when saved and loaded items match` | SET-08 |
| 同上 | `reloads when an item name changed` | SET-08 |
| `screenContext.test.ts` | `puts the catalog first, once, without colors` | MCP-01 |
| 同上 | `names the status filter from the catalog` | MCP-01 |
| 同上 | `starts the filtered tasks payload with the catalog` | MCP-01 |
| `memberAppData.test.ts` | `drops a leading BOM and leaves other text unchanged` | SET-02 |
| 同上 | `stores imported JSON without a BOM and reads it back` | SET-02 |
| 同上 | `imports the sample only once when two seeds overlap` | SET-02 |
| 同上 | `turns a storage failure into a user-facing error` | SET-02 |
| 同上 | `does not restore a sample catalog after it was removed` | SET-02 |
| `milestones.test.ts` | `rejects a blank name and an empty or impossible date` | EDIT-07 |
| 同上 | `accepts a name that is only padded with spaces` | EDIT-07 |
| 同上 | `appends a milestone without sorting or rejecting duplicates` | EDIT-07 |
| 同上 | `removes the milestone and clears only matching milestoneId` | EDIT-07 |
| 同上 | `skips ids already used by a category, group, task, or milestone` | EDIT-07, EDIT-08 |
| 同上 | `resets the milestone filter only when it is the deleted id` | EDIT-07 |
| 同上 | `reports whether any task points at the milestone` | EDIT-07 |
| 同上 | `stacks diamonds on the same day and reuses a lane after they end` | VIEW-04, EDIT-07 |
| 同上 | `updates groupId and keeps array order and id` | EDIT-07 |
| 同上 | `keeps the original name when the patch name is only spaces` | EDIT-07 |
| 同上 | `keeps the original groupId when the patch groupId is unknown` | EDIT-07 |
| 同上 | `returns the group for a y inside a block and null outside` | EDIT-07 |
| 同上 | `uses the preferred group when it exists` | EDIT-07 |
| 同上 | `falls back to the first group when the preferred id is missing` | EDIT-07 |
| 同上 | `truncates a lone screen label at the 24 full-width character cap` | VIEW-04 |
| 同上 | `cuts a screen label before the next diamond on the same lane` | VIEW-04 |
| `timelineRightPadding.test.ts` | `adds days when a visible milestone name extends past the base right edge` | VIEW-04 |
| 同上 | `does not extend for milestones in hidden groups` | VIEW-04, FILTER-11 |
| 同上 | `uses full export names for export mode padding` | VIEW-04, EXPORT-02 |
| 同上 | `covers truncated screen labels with bold width padding` | VIEW-04 |
| 同上 | `adds fewer days for narrow half-width names than full-width names` | VIEW-04 |
| 同上 | `does not extend when labels already fit the base range` | VIEW-04 |
| 同上 | `extends for month header labels past the base right edge` | VIEW-04 |
| `milestoneHoverLabel.test.ts` | `wraps within the chart width and shifts left when needed` | VIEW-04 |
| 同上 | `aligns the block top with the label top` | VIEW-04 |
| 同上 | `truncates with an ellipsis when the text exceeds max height` | VIEW-04 |
| `nonWorkingDay.test.ts` | `defaults to Sat/Sun when calendar is null` | VIEW-09 |
| 同上 | `respects workingDays override on weekends` | VIEW-09, SET-03 |
| 同上 | `treats an empty weekends list as no weekday holidays` | VIEW-09 |
| 同上 | `does not paint days past the schedule end` | VIEW-09 |
| 同上 | `respects nonWorkingDays on weekdays` | VIEW-09 |
| `stickyRows.test.ts` | `sticks nothing at the top of the list` | NAV-01 |
| 同上 | `sticks the open category and its first group after a short scroll` | NAV-01 |
| 同上 | `keeps those headers when the next task meets the band` | NAV-01 |
| 同上 | `slides the next group into the group slot` | NAV-01 |
| 同上 | `releases the finished group and keeps the next one` | NAV-01 |
| 同上 | `keeps the current headers before the next category arrives` | NAV-01 |
| 同上 | `swaps categories while the group stays in its slot` | NAV-01 |
| 同上 | `switches to the next category and group together` | NAV-01 |
| 同上 | `places the later task just below the sticky band` | NAV-01 |
| 同上 | `sticks nothing when the viewport is taller than the content` | NAV-01 |
| 同上 | `skips a collapsed group` | NAV-01 |
| 同上 | `skips a collapsed category` | NAV-01 |
| 同上 | `sticks only the category when every group is collapsed` | NAV-01 |
| 同上 | `returns no draws for an empty list` | NAV-01 |
| 同上 | `sticks all ancestor headers when scrolled into a deep task` | NAV-01 |
| 同上 | `sticks a single heading level when outline has one header row` | NAV-01 |
| 同上 | `slides the next sibling into its level slot` | NAV-01 |
| 同上 | `skips a collapsed hierarchy header` | NAV-01 |
| 同上 | `places a task just below the full sticky band` | NAV-01, EDIT-01, EDIT-14 |
| 同上 | `scrolls a task to just under the sticky headers` | NAV-01, EDIT-01, EDIT-14 |
| 同上 | `returns the task offset when the list fits` | NAV-01, EDIT-01, EDIT-14 |
| `rows.test.ts` | `relaxes filters that would hide a newly added task` | EDIT-08, EDIT-14 |
| 同上 | `keeps a search when only surrounding spaces differ` | EDIT-08, FILTER-01 |
| 同上 | `keeps filters that still show a newly added task` | EDIT-08 |
| 同上 | `keeps filters that match the duplicated task` | EDIT-14, FILTER-10 |
| 同上 | `matches note substring independently of name` | FILTER-02, FILTER-09 |
| 同上 | `keeps only the selected confidence` | FILTER-10 |
| 同上 | `keeps tasks with no tag when none are selected` | FILTER-12 |
| 同上 | `keeps only tasks that have any selected tag` | FILTER-12 |
| 同上 | `filters by the literal tag name all` | FILTER-12 |
| 同上 | `hides untagged tasks when every file tag is selected` | FILTER-12 |
| 同上 | `keeps tag filter when the duplicated task has that tag` | FILTER-12, EDIT-14 |
| 同上 | `keeps all selected tags when duplicated task matches one of them` | FILTER-12, EDIT-14 |
| `exportView.test.ts` | `lists selected tags in document order` | FILTER-12 |
| `filterChips.test.ts` | `shows a tag chip per selected tag in document order` | FILTER-12 |
| 同上 | `counts tag filter once regardless of how many tags are selected` | FILTER-12 |
| `fieldFilters.test.ts` | 四型の一致、値が無いの残すと除く、札、件数、定義なし、記録の1件だけ型不一致、下書き行の保持、`relaxFieldFiltersForNewTask`、`activeConditions` の並び、`filtered_tasks` の outline | FILTER-13 |
| `scheduleFilterPersistence.test.ts` | `version` 2 の `fieldFilters`、`version` 1 は追加項目が空、ほかの条件は戻る、`fieldFilters` 全体が壊れたときは初期値 | FILTER-13, SYNC-03 |
| `milestoneField.test.ts` | `prepends none and keeps array order without date sort` | EDIT-04, EDIT-14 |
| 同上 | `caps milestones at 50 and none does not count` | EDIT-04, EDIT-14 |
| 同上 | `returns -1 when current is beyond first 50 with empty query` | EDIT-04, EDIT-14 |
| 同上 | `returns -1 when current id is not in the milestone list with empty query` | EDIT-04 |
| 同上 | `prepends all and none when query is empty` | FILTER-07 |
| 同上 | `omits all and none when query is non-empty` | FILTER-07 |
| 同上 | `caps milestones at 50 and all or none do not count` | FILTER-07 |
| 同上 | `highlights all or none when query empty` | FILTER-07 |
| 同上 | `highlights current milestone when in shown list` | FILTER-07 |
| `taskTags.test.ts` | `matches substrings case-sensitively after trim` | FILTER-12 |
| 同上 | `keeps only tags that still exist, in document order` | FILTER-12 |
| `serialize.test.ts` | `writes tags after milestoneId and before note` | FILE-02 |
| `serialize.test.ts` | `does not write fields on the schedule document` | FILE-02 |
| `serialize.test.ts` | `orders task fieldValues after tags and before note in fields key order` | FILE-02 |
| `serialize.test.ts` | `omits fields when definitions are absent` | FILE-02 |
| `taskFields.test.ts` | 定義なし・五型・拒否・1キー更新・複製・`normalizeScheduleFieldsForValidation` | EDIT-04, FILE-02 |
| 同上 | `defaultFieldValuesForNewTask includes only keys with defaults` | SET-10, EDIT-04 |
| `fieldDefinitionEdit.test.ts` | キー採番・削除で値落下・候補の揃えと型変更・閉じる検証 | SET-10, FILE-02 |
| `fieldExtensionMerge.test.ts` | 合成キーと拡張同士の衝突 | SET-10 |
| `fieldExtensionEdit.test.ts` | 新規拡張の検証通過・プラグイン ID 拒否・項目 ID の反映 | SET-10 |
| `scheduleSemantics.test.ts` | `fieldValues on outline-only tasks` | EDIT-04, FILE-02 |
| `taskTodos.test.ts` | `floors fractional progress` など | EDIT-22 |
| `taskTodos.test.ts` | `canonicalizes progress from todo count on load` | EDIT-22, FILE-01 |
| `taskTodos.test.ts` | `canonicalizes progress from todo count for outline-only tasks` | EDIT-22, FILE-01 |
| `taskTags.test.ts` | `bumps schemaVersion from 6 to 7` | FILE-01 |
| 同上 | `quotes each tag for display` | FILE-07 |
| 同上 | `rejects whitespace-only, padded, and duplicate tags` | FILE-01 |
| 同上 | `accepts tags that differ only by case` | FILE-01 |
| `tasks.test.ts` | `does not copy predecessors or progress when patch starts fresh` | EDIT-14 |
| 同上 | `copies fields and predecessors without changing successors` | EDIT-14, FILTER-12 |
| 同上 | `excludes tasks without note when noteSearch is set` | FILTER-02 |
| 同上 | `matches task linked to selected milestone id` | FILTER-07 |
| 同上 | `keeps only tasks without milestone when filter is none` | FILTER-07 |
| 同上 | `shows empty groups and categories when filters and lineage are clear` | VIEW-01, VIEW-03, FILTER-09 |
| 同上 | `hides empty groups when a filter is set` | FILTER-09 |
| 同上 | `hides empty groups when lineage is set` | FILTER-09 |
| 同上 | `includes filtered-out tasks in category and group rollup` | VIEW-03 |
| 同上 | `includes collapsed tasks in rollup` | VIEW-03 |
| 同上 | `includes lineage-hidden tasks in rollup` | VIEW-03 |
| 同上 | `keeps parent bar summary on visible tasks only` | VIEW-03 |
| 同上 | `sets rollupPercent null on empty hierarchy rows` | VIEW-03 |
| `progressRollup.test.ts` | `does not weight by schedule duration` | VIEW-03 |
| 同上 | `counts done as 100 without changing stored progress` | VIEW-03 |
| 同上 | `uses not-started progress as-is` | VIEW-03 |
| 同上 | `uses in-progress progress from the field` | VIEW-03 |
| 同上 | `rounds to an integer and keeps zero` | VIEW-03 |
| 同上 | `averages tasks not group percents` | VIEW-03 |
| 同上 | `includes tasks in groups that would not appear as rows` | VIEW-03 |
| `screenContext.test.ts` | `keeps broken-link endpoints only when relation is broken` | MCP-01 |
| 同上 | `keeps unassigned and unknown assignee when assignee filter is unassigned` | MCP-01, FILTER-03 |
| 同上 | `respects lineage and still returns selected task outside filter` | MCP-01, FILTER-08, EDIT-01 |
| 同上 | `returns null when selection is not exactly one task` | MCP-01, EDIT-01 |
| 同上 | `returns empty array when nothing is selected`（`buildSelectedTasksPayload`） | MCP-01, EDIT-01 |
| 同上 | `matches single-task payload for one selection` | MCP-01, EDIT-01 |
| 同上 | `orders by document order not selection order` | MCP-01, EDIT-01 |
| 同上 | `includes tasks outside any filter because it does not use filters` | MCP-01, EDIT-01 |
| 同上 | `omits ids that are not tasks in the document` | MCP-01, EDIT-01 |
| `mcpRegistration.test.ts` | `writes a Windows path as the mcp.json command` | MCP-01 |
| 同上 | `keeps spaces and quotes inside the JSON command string` | MCP-01 |
| 同上 | `keeps a macOS path with spaces as the command string` | MCP-01 |
| `diffStripVisibility.test.ts` | `treats no open file message as empty` | FILE-07 |
| 同上 | `shows close for empty results` | FILE-07 |
| 同上 | `shows body only`（`resolveStripAfterAutoLoad`） | FILE-07 |
| 同上 | `keeps strip when explicit empty is pinned` | FILE-07 |
| 同上 | `defers only body to body while focused` | FILE-07 |
| `scheduleDiff.test.ts` | `says there is no difference when the documents match` | FILE-07 |
| `scheduleDiff.test.ts` | `formatScheduleDiff fieldValues` の `shows changed field values in definition order when lexicographic order differs` | FILE-07 |
| 同上 | `omits unchanged field value keys from the change block` | FILE-07 |
| 同上 | `shows unknown keys after defined keys on change` | FILE-07 |
| 同上 | `shows field values on added task only when values exist` | FILE-07 |
| 同上 | `says no difference when only field values match` | FILE-07 |
| 同上 | `shows field value changes for outline tasks` | FILE-07 |
| `fieldValuesDiff.test.ts` | `orders changed keys by definition order, not lexicographic` | FILE-07 |
| 同上 | `omits unchanged keys from change lines` | FILE-07 |
| 同上 | `places unknown keys after defined keys in lexicographic order` | FILE-07 |
| 同上 | `uses missing label and JSON values` | FILE-07 |
| 同上 | `snapshot lines skip empty keys` | FILE-07 |
| 同上 | `treats matching fieldValues as equal` | FILE-07 |
| `screenContext.test.ts` | `field catalog in MCP payloads` | MCP-01 |
| 同上 | `includes fields and fieldValues on selected_task` | MCP-01 |
| 同上 | `includes fields and fieldValues on selected_tasks` | MCP-01 |
| 同上 | `omits empty choices and empty default from field entries` | MCP-01 |
| 同上 | `current_schedule JSON shape` の `has no top-level fields property` | MCP-01 |
| `scheduleDiff.test.ts` | `shows todo list changes with markers` | EDIT-22, FILE-07 |
| `scheduleDiff.test.ts` | `formatScheduleDiff outline storage`（`shows todo list changes for outline tasks`、`omits todos when outline task todos match`、`shows full todos on added outline task`、`shows hierarchy definition changes`） | EDIT-22, FILE-07 |
| 同上 | `shows tag changes and distinguishes comma inside a tag from separate tags` | FILE-07 |
| 同上 | `shows calendar-day shifts for start and end` | FILE-07 |
| 同上 | `lists every field of an added task and skips sibling order` | FILE-07 |
| 同上 | `reports a deleted task and the predecessor dropped from the task that remains` | FILE-07 |
| 同上 | `treats the same name with a different id as a delete and an add` | FILE-07 |
| 同上 | `shows file-only edits as the difference from the current file to the screen` | FILE-07 |
| 同上 | `writes an order line only when the remaining ids are reordered` | FILE-07 |
| 同上 | `shows a task place change when it moves to another group` | FILE-07 |
| 同上 | `treats a group that moves to another category as a place change` | FILE-07 |
| 同上 | `treats a group rename as a name change and leaves tasks in place` | FILE-07 |
| 同上 | `treats a category rename as a name change` | FILE-07 |
| 同上 | `treats the same category name with a different id as a delete and an add` | FILE-07 |
| 同上 | `ignores predecessor order when the set is unchanged` | FILE-07 |
| 同上 | `shows a milestone date shift and a title change` | FILE-07 |
| 同上 | `shows a milestone confidence change after the date` | FILE-07 |
| 同上 | `writes milestone order and category order when the remaining items swap` | FILE-07 |
| 同上 | `writes a group order line when groups in a category swap` | FILE-07 |
| 同上 | `shows a cleared milestone link and the deleted milestone without an order line` | FILE-07 |
| 同上 | `does not write a milestone order line when a milestone is appended` | FILE-07 |
| 同上 | `writes a missing note as （なし）` | FILE-07 |
| 同上 | `shows task order when a new task is inserted before the end` | FILE-07 |
| 同上 | `omits task order for trailing append when existing order is unchanged` | FILE-07 |
| 同上 | `excludes trailing new tasks from the order line when reorder and append happen together` | FILE-07 |
| `baselineDiffs.test.ts` | `reports no changes when baseline, screen, and file match` | MCP-01 |
| 同上 | `classifies screen-only name change` | MCP-01 |
| 同上 | `classifies file-only fieldValues change` | MCP-01 |
| 同上 | `classifies conflicting fieldValues as 異なる` | MCP-01 |
| 同上 | `classifies file-only end date change` | MCP-01 |
| 同上 | `classifies screen name and file end on the same task as one 異なる line` | MCP-01 |
| 同上 | `classifies predecessor set differences as 異なる on the task` | MCP-01 |
| 同上 | `classifies screen delete and file change on the same id as 削除と変更` | MCP-01 |
| 同上 | `classifies trailing append in classification when diff body omits order` | MCP-01 |
| `baselineMerge.test.ts` | `merges screen name and file end on different tasks` | SYNC-01 |
| 同上 | `blocks same task with screen name and file end` | SYNC-01 |
| 同上 | `blocks different trailing appends on both sides` | SYNC-01 |
| 同上 | `merges screen-only task reorder` | SYNC-01 |
| 同上 | `returns sameOnly when both sides made the same end date change` | SYNC-01 |
| 同上 | `blocks screen delete and file change on the same id` | SYNC-01 |
| `baselineMergeDeferred.test.ts` | `restores the banner only when undo lands on the pre-merge document` | SYNC-01 |
| 同上 | `clears the banner only when redo lands on the post-merge document` | SYNC-01 |
| `baselineMergeReview.test.ts` | `puts screen name and file end in separate sections` | SYNC-01 |
| 同上 | `matches file-only name change by task id` | SYNC-01 |
| 同上 | `wraps add blocks in detail lines` | SYNC-01 |
| 同上 | `deduplicates plain location subheadings within a section` | SYNC-01 |
| 同上 | `lists same changes without field lines` | SYNC-01 |
| 同上 | `shows order preview when diff has order body` | SYNC-01 |
| 同上 | `strips uuid from visible text and localizes assignee and status` | SYNC-01 |
| `taskOrder.test.ts` | `stays pending until movement passes the threshold` | EDIT-15 |
| 同上 | `reorders when either axis passes the threshold` | EDIT-15, EDIT-16, EDIT-17 |
| 同上 | `ignores movement when reorder is not allowed` | EDIT-15 |
| 同上 | `moves a task within its group` | EDIT-15 |
| 同上 | `returns the same array when the index is unchanged` | EDIT-15 |
| 同上 | `places a task at the insert index from the original row positions` | EDIT-15 |
| 同上 | `returns rows when every sibling is visible` | EDIT-15 |
| 同上 | `returns null when a sibling is filtered out` | EDIT-15 |
| 同上 | `inserts before the first row` | EDIT-15 |
| 同上 | `inserts after the last row` | EDIT-15 |
| 同上 | `inserts between rows` | EDIT-15 |
| 同上 | `covers the full task row span` | EDIT-15 |
| 同上 | `places the marker at the preview gap` | EDIT-15 |
| 同上 | `finds the task index` | EDIT-15 |
| 同上 | `places a downward move at the index after the dragged task is removed` | EDIT-15 |
| 同上 | `inserts at the start of another group` | EDIT-15 |
| 同上 | `does not drop into a collapsed group` | EDIT-15 |
| `groupOrder.test.ts` | `moves a group and keeps its tasks` | EDIT-17 |
| 同上 | `returns the same array when the index is unchanged` | EDIT-17 |
| 同上 | `places a group at the insert index from the original spans` | EDIT-17 |
| 同上 | `returns spans when every sibling group is visible` | EDIT-17 |
| 同上 | `returns spans when a group is collapsed` | EDIT-17 |
| 同上 | `returns null when a sibling group is filtered out` | EDIT-17 |
| 同上 | `returns spans when a sibling group has no tasks` | EDIT-17 |
| 同上 | `returns null when the parent category is collapsed` | EDIT-17 |
| 同上 | `inserts before the first group` | EDIT-17 |
| 同上 | `inserts after the last group` | EDIT-17 |
| 同上 | `inserts between groups` | EDIT-17 |
| 同上 | `covers the groups in one category` | EDIT-17 |
| 同上 | `places the marker at the group boundary` | EDIT-17 |
| 同上 | `finds the group index in its category` | EDIT-17 |
| 同上 | `accepts another category when the name is free and a group remains` | EDIT-17 |
| 同上 | `rejects a category that already has the same group name` | EDIT-17 |
| 同上 | `rejects moving the last group out of its category` | EDIT-17 |
| `categoryOrder.test.ts` | `moves a category and keeps its groups` | EDIT-16 |
| 同上 | `returns the same array when the index is unchanged` | EDIT-16 |
| 同上 | `places a category at the insert index from the original spans` | EDIT-16 |
| 同上 | `returns spans when every category is visible` | EDIT-16 |
| 同上 | `returns spans when a category is collapsed` | EDIT-16 |
| 同上 | `returns null when a category is filtered out` | EDIT-16 |
| 同上 | `returns spans when a category has only empty groups` | EDIT-16 |
| 同上 | `inserts before the first category` | EDIT-16 |
| 同上 | `inserts after the last category` | EDIT-16 |
| 同上 | `inserts between categories` | EDIT-16 |
| 同上 | `covers the full category stack` | EDIT-16 |
| 同上 | `places the marker at the category boundary` | EDIT-16 |
| 同上 | `finds the category index` | EDIT-16 |
| `droppedSchedulePaths.test.ts` | `accepts a single json path` | FILE-08, WIN-04 |
| 同上 | `accepts json extension case-insensitively` | FILE-08, WIN-04 |
| 同上 | `rejects two json files` | FILE-08, WIN-04 |
| 同上 | `rejects a non-json file` | FILE-08, WIN-04 |
| 同上 | `rejects json with an extra path` | FILE-08, WIN-04 |
| 同上 | `rejects a folder path only` | FILE-08, WIN-04 |
| `droppedScheduleExternalDispatch.test.ts` | `returns busy before invalid selection` | FILE-08, WIN-04 |
| 同上 | `returns invalid for a folder path only` | FILE-08, WIN-04 |
| `droppedScheduleOpenRoute.test.ts` | `focuses the newest window that already has the same path` | WIN-04 |
| 同上 | `opens in the only pathless window` | WIN-04 |
| 同上 | `opens a new window when every window already has a path` | WIN-04 |
| 同上 | `opens in the sole pathless window among several` | WIN-04 |
| `droppedScheduleOpenGate.test.ts` | `returns busy when reordering` | FILE-08, WIN-04 |
| 同上 | `returns null when ready` | FILE-08, WIN-04 |
| `scheduleExternalReload.test.ts` | `returns invalid for broken JSON` | SYNC-01 |
| 同上 | `returns noop when canonical matches baseline` | SYNC-01, FILE-04 |
| 同上 | `returns confirm when dirty and content differs` | SYNC-01 |
| 同上 | `returns confirm when an edit dialog is open` | SYNC-01 |
| 同上 | `returns apply when clean and content differs` | SYNC-01 |
| `scheduleMigrate.test.ts` | `rejects v1 after date migration because v2 is no longer supported` | FILE-01 |
| 同上 | `rejects v2 documents` | FILE-01 |
| 同上 | `accepts assigneeId and confidence` | FILE-01 |
| 同上 | `reads a v3 task without confidence as committed and canonicalizes to v5` | FILE-01, FILE-04 |
| 同上 | `reads a milestone without confidence as committed and keeps one already set` | FILE-01, FILE-04 |
| 同上 | `rejects a milestone confidence that is not tentative or committed` | FILE-01 |
| 同上 | `keeps confidence already present on a v3 task` | FILE-01 |
| 同上 | `rejects a v4 task without confidence` | FILE-01 |
| 同上 | `assigns the same hierarchy ids each time a v4 document is opened` | FILE-01, FILE-04 |
| 同上 | `picks another hierarchy id when the name-derived id is already used` | FILE-01 |
| 同上 | `rejects a category id that duplicates a milestone id` | FILE-01 |
| 同上 | `rejects a group id that duplicates its category id` | FILE-01 |
| 同上 | `rejects a category id that duplicates a task id` | FILE-01 |
| `uuidV5.test.ts` | `matches the RFC 4122 DNS example` | FILE-01 |
| `scheduleTitleEdit.test.ts` | `treats blank-only input as blank` | EDIT-20 |
| 同上 | `treats trim-equal title as unchanged` | EDIT-20 |
| 同上 | `keeps internal spaces and reports changed title` | EDIT-20 |
| `history.test.ts` | `undo restores a title change in one step` | EDIT-10, EDIT-20 |
| `recentFiles.test.ts` | `appendRecentFile` など、スケジュールと設定ファイルの二系統 | FILE-09 |
| `recentFilesMenu.test.ts` | 見出し付きの二グループとコマンドパレットの接頭辞 | FILE-09 |
| `workspaceLoad.test.ts` | 設定ファイル束縛の表示ラベル | FILE-10, SET-02 |
| `workspacePath.test.ts` | 相対パスの受理と拒否 | FILE-10 |
| `workspaceJson.test.ts` | 開き分けと検証、末尾区切りの拒否 | FILE-10 |
| `workspace::export_tests`（Rust） | 空でないフォルダの拒否、シンボリックリンク、部分書き出し後の文言、拡張ファイル名の重複回避 | FILE-11 |
| `droppedScheduleOpenRoute.test.ts` | `routeExternalWorkspaceDrop` | FILE-10, WIN-04 |
| `commandPalette.test.ts` | `inserts recent files after open on desktop` など | FILE-09, NAV-07 |
| `recent_files.rs` | `writes_only_when_expected_matches` など | FILE-09 |
| `commandPalette.test.ts` | `includes edit title command` | NAV-07, EDIT-20 |
| `hierarchyRename.test.ts` | `trims the name and keeps the id` | EDIT-13 |
| 同上 | `keeps the original name when the input is blank` | EDIT-13 |
| 同上 | `rejects a duplicate category name` | EDIT-13 |
| 同上 | `rejects a duplicate name in the same category` | EDIT-13 |
| 同上 | `allows the same group name in another category` | EDIT-13 |
| 同上 | `keeps the original name when the input is blank` | EDIT-13 |
| `baselineDiffsOutline.test.ts` | `classifies file-only task end on outline storage`、`merges file-only task change into outline document`、`blocks when screen adds a level and file changes a task`、`classifies same key with number on screen and string on file as 異なる` | SYNC-01, EDIT-21 |
| 同上 | `classifies screen-only todos with diff body`、`classifies conflicting todos as 異なる and blocks merge`、`classifies matching todo changes as 同じ` | EDIT-22, FILE-07, SYNC-01, MCP-01 |
| `baselineMergeReview.test.ts` | `buildBaselineMergeReview outline storage`（`shows todo fields for screen-only outline change`、`shows conflicting todo values in screen and file sections`） | EDIT-22, SYNC-01 |
| `hierarchyLevelEdit.test.ts` | `keepsLegacyShapeWhenDefinitionUnchanged`、`acceptsAlignedIncomingWhenLevelCountDiffers`、`rejectsLegacyIncomingWhenScreenIsNotThreeLevels`、`rejectsMisalignedIncomingWhenLevelCountDiffers` | EDIT-21, FILE-02, MCP-01 |
| 同上 | `renamesWithoutMovingRows` | EDIT-21 |
| 同上 | `refusesSaveWhenCountMismatches` | EDIT-21, FILE-02 |
| 同上 | `prefixesLevelsOnce` | MCP-01 |
| 同上 | `rejectsReplaceWhenDepthDiffers` | MCP-01 |
| `hierarchy.test.ts` | `keeps keys unchanged when saving without levels` など | FILE-04, VIEW-03 |
| 同上 | `rejects levels with categories storage`、`addTopLevelMenuLabel` | EDIT-18 |
| `hierarchyCrud.test.ts` | `appendLegacyHeadingFromToolbar` | EDIT-18 |
| `outlineCrud.test.ts` | `appendOutlineHeadingAtLevel three and four levels` | EDIT-18 |
| `hierarchyGuide.test.ts` | 5段タスクの線の本数、折りたたみ、絞り込み後の親線、ドラッグ塊の深さ0 | VIEW-01 |
| 同上 | `validates the five-level sample schedule file` | FILE-04 |
| `hierarchyCrud.test.ts` | `inserts a category with an empty default group` | EDIT-18 |
| 同上 | `rejects a blank category name` | EDIT-18 |
| 同上 | `rejects duplicate category names on add` | EDIT-18 |
| 同上 | `deletes only when allowed` | EDIT-19 |
| 同上 | `moves a task to another group by id` | EDIT-15 |
| 同上 | `moves a group to another category when names do not clash` | EDIT-17 |
| 同上 | `returns the same array when the target category has the same group name` | EDIT-17 |
| 同上 | `shows a cross-category group move as a location change in diff` | FILE-07, EDIT-17 |
| 同上 | `refuses to empty the source category of groups` | EDIT-17 |
| 同上 | `shows cross-group task move as location change in diff` | FILE-07, EDIT-15 |
| 同上 | `rejects a duplicate group name` | EDIT-18 |
| 同上 | `appends at category end` | EDIT-18 |
| `scheduleRecovery.test.ts` | `accepts a valid draft` | SYNC-03 |
| 同上 | `rejects invalid document JSON` | SYNC-03 |
| 同上 | `returns the parent and skips a bare filename` | SYNC-03 |
| 同上 | `returns none when nothing was open` | SYNC-03 |
| 同上 | `opens the saved file when there is no draft` | SYNC-03 |
| 同上 | `opens a saved file when only formatting differs` | SYNC-03, FILE-04 |
| 同上 | `restores when disk matches baseline` | SYNC-03 |
| 同上 | `returns conflict when disk differs from baseline` | SYNC-03 |
| 同上 | `returns invalidDraft for broken draft wrapper` | SYNC-03 |
| 同上 | `returns missingWithEdits when the file is gone and a draft exists` | SYNC-03 |
| 同上 | `returns missingNotice when the saved file is gone` | SYNC-03 |
| 同上 | `uses the draft path when no last path was stored` | SYNC-03 |
| 同上 | `ignores a draft for a different path and opens the remembered file` | SYNC-03 |
| 同上 | `restores when disk formatting differs but canonical matches` | SYNC-03, FILE-04 |
| 同上 | `returns invalidDisk when the file fails validation` | SYNC-03 |
| `scheduleFilterPersistence.test.ts` | `accepts a valid file` など | SYNC-03 |
| `serialize.test.ts` | `omits empty note` | EDIT-06 |
| 同上 | `writes confidence after progress` | FILE-02 |
| 同上 | `writes milestone confidence after date` | FILE-02 |
| 同上 | `includes trimmed note` | EDIT-06 |
| `appKeyboard.test.ts` | `clears link mode on Escape and leaves a menu to close itself` | EDIT-12 |
| 同上 | `opens add, milestone, duplicate, and reorders within a group` | EDIT-07, EDIT-08, EDIT-14, EDIT-15 |
| 同上 | `suppresses workflow shortcuts during a dialog or link mode outside fields` | EDIT-07, EDIT-08, EDIT-14, EDIT-15 |
| `shortcuts.test.ts` | `matches add, milestone, duplicate, and reorder keys` | EDIT-07, EDIT-08, EDIT-14, EDIT-15 |
| `commandPalette.test.ts` | `disables add and duplicate commands in link mode without selection` | NAV-07 |
| 同上 | `deletes the hovered link before the selected task` | EDIT-09, EDIT-12 |
| 同上 | `drops file shortcuts while a file operation is busy and keeps find` | FILE-02, NAV-05 |
| 同上 | `ignores undo and redo in a dialog or text field` | EDIT-10 |
| 同上 | `opens the note for the selected task and swallows a no-op` | EDIT-06 |
| 同上 | `steps display scale from a dialog, a field, or a repeat` | SET-01 |
| `saveFlight.test.ts` | `rejects a second save until the first releases the flight` | FILE-02, SYNC-02 |
| 同上 | `does not start a save while the file operation is busy` | FILE-02 |
| `recoveryApply.test.ts` | `accepts before checking the generation again and skips the screen update` | SYNC-03 |
| 同上 | `does not accept once the generation has already moved on` | SYNC-03 |
| `pollGate.test.ts` | `does not read or apply while a file operation is busy or paused` | SYNC-01 |
| 同上 | `prompts for a missing file on the fifth consecutive read failure` | SYNC-01 |
| `shortcuts.test.ts` | `maps save, save as, open, and find` | FILE-01, FILE-02, FILE-03, NAV-05 |
| 同上 | `keeps file shortcuts while typing and drops them in a dialog` | FILE-02 |
| 同上 | `maps Enter and Delete only when edit keys are free` | EDIT-04, EDIT-09 |
| 同上 | `maps command L for drawing a link unless a field or dialog has focus` | EDIT-12 |
| 同上 | `maps command N for the selected task note unless a field or dialog has focus` | EDIT-06 |
| 同上 | `uses the command key for the note hint` | EDIT-06 |
| 同上 | `uses the command key on mac and ctrl elsewhere` | EDIT-12 |
| 同上 | `blocks fields but not buttons` | EDIT-12 |
| 同上 | `ignores undo, zoom-like modifiers, and alt combinations` | EDIT-10 |
| 同上 | `scrolls one row with ctrl or meta and an arrow` | NAV-01 |
| 同上 | `scrolls while an edit key target is focused` | NAV-01 |
| 同上 | `does not scroll for a bare arrow, shift, alt, or a dialog` | NAV-01 |
| 同上 | `scrolls when both ctrl and meta are held` | NAV-01 |
| 同上 | `maps plus, equals, and minus with ctrl or meta` | SET-01 |
| 同上 | `ignores underscore, alt, a bare key, and zero` | SET-01 |
| 同上 | `marks save, open, find, and note so the browser action can be cancelled` | FILE-02, NAV-05, EDIT-06 |
| 同上 | `blocks text fields, buttons, and links` | EDIT-04 |
| 同上 | `uses the command key on Apple platforms` | EDIT-12 |
| `sidebarWidth.test.ts` | `uses 190 when nothing is stored` | NAV-06 |
| 同上 | `rejects values that are not numbers` | NAV-06 |
| 同上 | `clamps stored widths below 140` | NAV-06 |
| 同上 | `rounds to the nearest pixel` | NAV-06 |
| 同上 | `keeps the preferred width when the chart still fits` | NAV-06 |
| 同上 | `shrinks only the applied width when the window is tight` | NAV-06 |
| 同上 | `returns the preferred width before the main area is measured` | NAV-06 |
| 同上 | `stays inside the minimum and the chart floor` | NAV-06 |
| 同上 | `does not replace the preferred width when the minimum cannot fit` | NAV-06 |
| 同上 | `shrinks from the requested width` | NAV-06 |
| 同上 | `keeps the preferred width when a drag cannot move the edge` | NAV-06 |
| 同上 | `shrinks from the visible width` | NAV-06 |
| 同上 | `grows from the visible width when the chart has room` | NAV-06 |
| 同上 | `keeps the preferred width when a key cannot move the edge` | NAV-06 |
| 同上 | `stores a custom width and clears the key at the default` | NAV-06 |
| 同上 | `ignores localStorage failures` | NAV-06 |
| `summary.test.ts` | `merges spans that start the day after the previous end` | VIEW-03 |
| 同上 | `keeps a single day as one span` | VIEW-03 |
| 同上 | `merges overlapping spans` | VIEW-03 |
| 同上 | `leaves a one-day gap between spans` | VIEW-03 |
| 同上 | `draws a single-day summary through the exclusive end` | VIEW-03 |
| `tasks.test.ts` | `inserts the copy immediately after the source` | EDIT-14 |
| 同上 | `does not copy predecessors or progress when patch starts fresh` | EDIT-14 |
| 同上 | `copies fields and predecessors without changing successors` | EDIT-14 |
| 同上 | `rejects a cycle created by a successor link` | EDIT-14, EDIT-05 |
| 同上 | `reports a missing source` | EDIT-14 |
| `taskEditCycles.test.ts` | `detects indirect cycles` | EDIT-05 |
| 同上 | `detects a direct cycle` | EDIT-05 |
| 同上 | `clears a cycle once the closing predecessor is removed` | EDIT-05 |
| 同上 | `accepts acyclic edits` | EDIT-05 |
| `taskNote.test.ts` | `rejects a whitespace-only note` | FILE-01, EDIT-06 |
| 同上 | `accepts a note with text` | FILE-01, EDIT-06 |
| 同上 | `trims and drops blank` | EDIT-06, VIEW-11 |
| 同上 | `reflects normalized content` | VIEW-11 |
| 同上 | `sets or removes note` | EDIT-06 |
| `uiScale.test.ts` | `uses 1 at or below the design baseline` | SET-01 |
| 同上 | `scales up for larger viewports up to 2` | SET-01 |
| 同上 | `accepts auto and fixed ratios` | SET-01 |
| 同上 | `falls back to auto for invalid stored values` | SET-01 |
| 同上 | `round-trips every display scale option` | SET-01 |
| 同上 | `uses viewport scaling when preference is auto` | SET-01 |
| 同上 | `uses fixed preference regardless of viewport` | SET-01 |
| 同上 | `stores fixed ratios and persists auto` | SET-01 |
| `wheelScroll.test.ts` | `scrolls vertically from deltaY alone` | NAV-01 |
| 同上 | `scrolls horizontally from deltaX alone` | NAV-01 |
| 同上 | `scrolls both axes on diagonal gesture` | NAV-01 |
| 同上 | `maps shift+vertical wheel to horizontal scroll` | NAV-01 |
| 同上 | `uses swapped horizontal delta once when only deltaX is set` | NAV-01 |
| 同上 | `does not double-count equal deltas under shift` | NAV-01 |
| 同上 | `ignores deltaX under shift when deltas differ` | NAV-01 |
| 同上 | `maps vertical wheel to horizontal scroll` (header) | NAV-01 |
| 同上 | `maps horizontal delta to horizontal scroll` (header) | NAV-01 |
| 同上 | `adds both axes when they differ` (header) | NAV-01 |
| 同上 | `counts shift swap once` (header) | NAV-01 |
| 同上 | `adds both axes under shift when they differ` (header) | NAV-01 |
| 同上 | `zooms in from negative deltaY with ctrl` | NAV-01, NAV-02 |
| 同上 | `zooms out from positive deltaY with meta` | NAV-01, NAV-02 |
| 同上 | `ignores deltaX for zoom and scroll` | NAV-01, NAV-02 |
| `chartScroll.test.ts` | `keeps scrollX when the task bar is already visible` | NAV-01, EDIT-01 |
| `timeline.test.ts` | `uses outline task dates when categories are empty` | VIEW-04 |
| 同上 | `keeps the origin when a later start would scroll past the left edge` | EDIT-02, NAV-01 |
| 同上 | `fitViewAfterOpen` の `returns null when viewport width is zero or negative` | FILE-01, NAV-03 |
| 同上 | `fits with zero prefix days and resets scroll positions` | FILE-01, NAV-03 |
| 同上 | `does not include prefix days unlike fit with a positive prefix` | FILE-01, NAV-03 |
| 同上 | `adopts a later start when the scroll can keep the same day in place` | EDIT-02, NAV-01 |
| 同上 | `adopts an earlier start and increases scroll` | EDIT-02, NAV-01 |
| 同上 | `includes extra days when fitting to the viewport width` | NAV-01, VIEW-04 |
| 同上 | `includes prefix days before the data range when fitting` | NAV-01, VIEW-04 |
| `contrast.test.ts` | `meets text contrast for bar labels` | VIEW-02 |
| 同上 | `steps a fixed ratio and stays put at the ends` | SET-01 |
| 同上 | `leaves auto for the neighboring fixed step` | SET-01 |
| 同上 | `compares auto scale at two decimal places` | SET-01 |
| `chartHitTest.test.ts` | `extends the selected bar by the resize handle` | EDIT-02, EDIT-03, EDIT-12 |
| 同上 | `keeps a clickable middle when the bar is longer than the resize edges` | EDIT-01, EDIT-03 |
| 同上 | `classifies the full resize-only zone from pointer position` | EDIT-01, EDIT-03, EDIT-04, EDIT-11 |
| 同上 | `finds a resize-only edge only within the bar height` | EDIT-03 |
| 同上 | `does not extend the handle while drawing a link` | EDIT-12 |
| 同上 | `prefers a task or milestone over a link` | EDIT-11, EDIT-12 |
| 同上 | `misses tasks and links in the sticky band` | NAV-01 |
| 同上 | `hits a link only when the pointer misses bars and diamonds` | EDIT-12 |
| 同上 | `places the link preview at the sidebar, bar start, or pointer` | EDIT-12 |
| 同上 | `hits a milestone diamond inside the slop and misses outside it` | VIEW-04, EDIT-11 |
| 同上 | `hits the milestone name and the gap, and misses past the name and lane padding` | EDIT-07, EDIT-11 |
| 同上 | `extends the name hit to the text height when that is taller than the circle` | EDIT-07 |
| `colorScheme.test.ts` | `accepts light and dark` | SET-04 |
| `autoUpdate.test.ts` | `treats on as enabled`、localStorage の読み書き、更新確認の失敗を出さない条件、`classifyUpdateCheckError` | SET-06 |
| `storeDistribution.test.ts` | `readStoreDistribution` が Tauri で `is_store_distribution` を呼ぶ | SET-06 |
| `betaRelease.test.ts` | `updater-X` の除外、一覧から最新ベータを選ぶ、入っている版より新しいときだけ保存対象、OS に合うファイル名 | SET-06 |
| 同上 | `stores fixed schemes and clears key for system` | SET-04 |
| 同上 | `falls back to system for missing or invalid values` | SET-04 |
| 同上 | `uses OS preference when set to system` | SET-04 |
| 同上 | `ignores OS when light or dark is chosen` | SET-04 |
| `exportHtml.test.ts` | `uses dark palette when colorScheme is dark` | SET-04, EXPORT-01 |
| `validateCalendar.test.ts` | `rejects the same date in nonWorkingDays and workingDays` | SET-03 |
| 同上 | `rejects a duplicate date inside nonWorkingDays` | SET-03 |
| 同上 | `rejects duplicate weekends` | SET-03 |
| `validateMembers.test.ts` | `allows duplicate display names` | SET-02 |
| 同上 | `rejects a duplicate id` | SET-02 |
| 同上 | `rejects a blank name` | SET-02 |

`dates.test.ts` の夏時間のケースは、特定の機能ではなく、日付計算の基礎を確かめるものである。

| `releaseVersion.test.ts` | `accepts stable versions`、先頭 `0` の拒否 | — |
| 同上 | `bumps major, minor, patch on stable only`（ベータでは失敗） | — |
| 同上 | `bumps beta from stable and from beta`、`strips beta suffix` | — |
| 同上 | `rejects beta on main`、`rejects stable on release branch` | — |
| 同上 | `rejects unsupported release branch name`、`rejects release branch base mismatch` | — |
| 同上 | `rejects tag on different commit`、`allows retry when tag points at same commit` | — |

### Rust

| テスト | 確認すること | 機能 ID |
| --- | --- | --- |
| `skips_mcp_launch` | `--mcp` だけの起動ではパスを開かない | WIN-04 |
| `skips_screen_launch` | `--screen` だけの起動ではパスを開かない | WIN-04 |
| `collects_absolute_paths_from_launch` | 起動引数からパスだけを集める | WIN-04 |
| `skips_executable_in_single_instance_args` | 2つ目のプロセスの先頭の実行ファイルを数えない | WIN-04 |
| `dedupes_identical_batches_in_queue` | キューに残っている同じパス束の重複を捨てる | WIN-04 |
| `accepts_same_batch_after_pop` | 処理したあと同じパス束をもう一度入れられる | WIN-04 |
| `sanitize_export_filename_removes_path_separators` | パス区切りを除く | EXPORT-04 |
| `sanitize_export_filename_uses_default_for_empty` | 空なら `schedule.html` | EXPORT-04 |
| `sanitize_export_filename_adds_extension` | 拡張子を足す | EXPORT-04, FILE-02 |
| `export_xlsx::write_excel_bytes_produces_xlsx` | xlsx の先頭が ZIP である | EXPORT-05 |
| 同上 | `screen_gridlines_are_off` | シートの `showGridLines` が 0 である | EXPORT-05 |
| 同上 | `shape_pixel_dimensions_clamps_thin_lines` | EXPORT-05 |
| 同上 | `thin_shape_in_xlsx_is_not_default_textbox_size` | 実ブックのバー図形が 5×40px の EMU で、192×120 既定にならない | EXPORT-05 |
| 同上 | `bar_anchor_matches_payload_pixels` | バーの `twoCellAnchor` と幅・高さの EMU が payload の図形と一致する | EXPORT-05 |
| 同上 | `bar_tentative_pattern_in_xlsx` | 未確定バーに `pct20` と前景色がある | EXPORT-05 |
| 同上 | `connector_snaps_straight_between_two_bars` | 直線コネクタの接続点と bounds が実ブックのバー辺の中央と一致する | EXPORT-05 |
| 同上 | `connector_snaps_bent_between_two_rows` | カギ線コネクタの bounds と `flipH` / `flipV` がバーアンカーから求めた値と一致する | EXPORT-05 |
| 同上 | `connector_omitted_when_bar_anchor_is_missing` | スナップできないときコネクタが付かない | EXPORT-05 |
| 同上 | `today_line_matches_payload` | `prst="line"` の列・色・高さが payload の `todayLine` と一致する | EXPORT-05 |
| 同上 | `today_line_absent_when_payload_has_none` | `todayLine` が無いとき `line` 図形が無い | EXPORT-05 |
| 同上 | `milestone_group_merge_and_diamond_column` | マイルストン行の左結合にグループ名があり、日付列のセルに ◆ と名前がある | EXPORT-05 |
| 同上 | `column_width_change_moves_bar_width_only` | 列幅だけ違う二つのブックでバー幅だけが変わる | EXPORT-05 |
| 同上 | `row_height_change_moves_vertical_offsets_only` | 行高だけ違う二つのブックで縦位置と今日の線の高さだけが変わる | EXPORT-05 |
| 同上 | `stroke_color_change_updates_connector_rgb_only` | 色だけ違う二つのブックでコネクタの `srgbClr` だけが変わる | EXPORT-05 |
| 同上 | `summary_gap_line_spans_date_columns` | 親バーの点線が列をまたぎ、角が `rtTriangle` で、追加図形の id がバーと重ならない | EXPORT-05 |
| `excel_drawing_patch` | `connector_anchors_use_edge_centers_same_row` など | 辺の中央へのスナップと `flipH` / `flipV` | EXPORT-05 |
| 同上 | `horizontal_span_end_advances_columns_by_width` | 日付列幅で終端列と列内オフセットを進める | EXPORT-05 |
| `require_active_save_path_accepts_matching_path` | 開いているパスと一致すれば上書きできる | FILE-02 |
| `require_active_save_path_rejects_mismatch_and_missing` | パスの不一致と、ファイルを開いていない状態は拒否する | FILE-02 |
| `should_close_default_main_when_main_not_recorded` | 記録に `main` が無いときだけ、起動時に空の `main` を閉じる | SYNC-03, WIN-01 |
| `should_remove_label_after_destroy_when_another_window_remains` | 終了中以外で別ウィンドウが残る破棄では一覧から外す | SYNC-03, WIN-01 |
| `resolve_mcp_label_prefers_recorded_then_os_then_focus_order` | MCP の送り先は記録の前面、OS の前面、直近の前面順の順で決める | MCP-01, WIN-01 |
| `reply_from_other_window_keeps_pending` | 送り先と違うウィンドウの応答は pending を外さない | MCP-01, WIN-01 |
| `dedupe_keeps_focused_path` | 同じパスが複数あるとき、前面のウィンドウの未保存を残す | SYNC-03, WIN-01 |
| `pending_open_roundtrips_workspace_path`（`window_session.rs`） | 新しいウィンドウ用の pending が設定ファイルのパスを往復する | WIN-01, FILE-10 |
| `workspace_path_for_schedule_record_*` と `upsert_schedule_record_preserves_workspace_path_in_file`（`window_session.rs`） | 同じスケジュールパスの記録し直しで `workspacePath` を残し、直接開きと別パスでは外す | FILE-10, SYNC-03 |
| `recovery_owner_is_latest_focused_window_for_path` | 同じパスでは、最後に前面だったウィンドウが控えの書き手になる | SYNC-03, WIN-01 |
| `recovery_owner_falls_back_to_first_window` | 前面の記録が無いときは、一覧の最初のウィンドウが書き手になる | SYNC-03 |
| `recovery_owners_are_fixed_per_path` | 終了前の前面を、パスごとに控えの書き手として固定する | FILE-05, SYNC-03 |
| `recovery_close_keeps_front_window_only` | 同じパスが残る閉じでは控えを書かず、終了時は前面だけが書く | FILE-05, SYNC-03 |
| `migrate_moves_legacy_files_and_removes_them` | 古い記録を新しい控えとウィンドウ一覧へ移し、移し終えたら消す | SYNC-03 |
| `migrate_keeps_unreadable_legacy_recovery` | 読めない古い控えは消さず、ウィンドウ一覧も作らない | SYNC-03 |
| `path_recovery_key_is_stable` | パスから控えファイル名のハッシュが安定する | SYNC-03 |
| `filter_path_uses_same_hash_as_recovery` | 絞り込みのファイル名のハッシュは控えと同じ | SYNC-03 |
| `choose_open_directory_uses_parent_or_home` | 初期フォルダは親があればそこ、無ければホーム | SYNC-03 |
| `validate_project_folder_rejects_relative_and_symlink` | 相対パスと、シンボリックリンクのプロジェクトフォルダを拒否する | SET-05 |
| `skill_destinations_stay_under_allowed_bases` | 書き先はユーザー全体か指定フォルダの5スキルに限る | SET-05 |
| `skill_destinations_copilot_user_and_project` | Copilot はユーザー全体で `~/.copilot/skills/`、指定フォルダで `.github/skills/` の5スキルだけ | SET-05 |
| `skill_destinations_all_tools_user_scope` | 3ツール同時のユーザー全体は15パス。並びは Cursor、Claude Code、GitHub Copilot の順で、各5つは `JSON_SKILL_NAMES` の順 | SET-05 |
| `bundled_skill_lists_match_json_skill_names_in_tauri_and_msix` | `JSON_SKILL_NAMES` の各名前が `tauri.conf.json` の `json-skills/<name>/` と MSIX の `json-skills\<name>\SKILL.md` にある。`read-screen/` と `read-screen\SKILL.md` もある | SET-05 |
| `parse_tool_selection_requires_at_least_one` | ツール未選択は「ツールを1つ以上選んでください。」 | SET-05, MCP-02 |
| `claude_user_shadows_only_when_claude_project_scope` | Copilot だけの指定フォルダでは Claude の個人用優先警告を出さない | SET-05 |
| `install_creates_copilot_parent_directories` | 無い `~/.copilot/skills` を実ディレクトリとして作る | SET-05 |
| `install_does_not_write_through_github_symlink` | `.github` がシンボリックリンクなら Copilot の指定フォルダへ置かない | SET-05 |
| `install_and_uninstall_skip_when_user_copilot_dir_is_symlink` | ユーザー全体の `.copilot` がシンボリックリンクなら Copilot へ置かず、外さない | SET-05 |
| `uninstall_does_not_remove_through_github_symlink` | 指定フォルダの `.github` がシンボリックリンクなら Copilot を外さない | SET-05 |
| `install_and_uninstall_skip_when_user_copilot_skills_is_symlink` | ユーザー全体の `.copilot/skills` がシンボリックリンクなら Copilot へ置かず、外さない | SET-05 |
| `install_and_uninstall_skip_when_project_github_skills_is_symlink` | 指定フォルダの `.github/skills` がシンボリックリンクなら Copilot へ置かず、外さない | SET-05 |
| `install_without_replace_leaves_existing` | 置き換えを確認するまでは既存を残し、何も書かない | SET-05 |
| `install_creates_real_parent_directories` | 無い `.cursor/skills` を実ディレクトリとして作る | SET-05 |
| `install_without_replace_treats_symlink_as_existing` | 壊れたシンボリックリンクも既存として、確認前は書かない | SET-05 |
| `install_replaces_symlink_destination` | 宛先のシンボリックリンクはリンクだけ外し、リンク先は残す | SET-05 |
| `install_does_not_write_through_tool_dir_symlink` | `.cursor` がシンボリックリンクなら置かない | SET-05 |
| `place_staged_skill_restores_original_when_copy_fails` | 入れ替えのコピーに失敗したら元のフォルダを残す | SET-05 |
| `install_keeps_earlier_skill_when_a_later_copy_fails` | 後続のコピーに失敗しても、先に置けたスキルは残る | SET-05 |
| `uninstall_removes_only_bundled_skill_folders` | 外すのは4スキルだけで、別名のスキルは残す | SET-05 |
| `uninstall_does_not_remove_through_tool_dir_symlink` | `.cursor` がシンボリックリンクなら外さない | SET-05 |
| `uninstall_removes_broken_symlink_at_destination` | 宛先の壊れたシンボリックリンクはリンクだけ外す | SET-05 |
| `uninstall_does_not_follow_symlink_inside_skill` | スキル内のシンボリックリンクの先は消さない | SET-05 |
| `screen_tool_requires_exactly_two_args`（`screen_cli.rs`） | `--screen` はツール名とセットで 2 引数だけ | MCP-02 |
| `screen_tool_rejects_unknown_name`（`screen_cli.rs`） | 未知のツール名は待ち受けへ繋がない | MCP-02 |
| `screen_tool_accepts_replace_schedule`（`screen_cli.rs`） | `--screen replace_schedule` を受け付ける | MCP-02 |
| `replace_schedule_stdin_rejects_over_max_bytes`（`screen_cli.rs`） | 標準入力が 10MB を1バイト超えると拒否する | MCP-02 |
| `replace_schedule_stdin_rejects_empty`（`screen_cli.rs`） | 空の標準入力は拒否する | MCP-02 |
| `replace_schedule_stdin_rejects_invalid_json`（`screen_cli.rs`） | 壊れた JSON は拒否する | MCP-02 |
| `replace_schedule_stdin_accepts_json_object`（`screen_cli.rs`） | オブジェクト JSON を受け付ける | MCP-02 |
| `replace_schedule_stdin_strips_bom_before_parse`（`screen_cli.rs`） | UTF-8 BOM を外してから解釈する | MCP-02 |
| `extract_tool_output_splits_success_and_error`（`screen_cli.rs`） | ツール結果の `isError` で標準出力と標準エラーを分ける | MCP-02 |
| `render_replaces_executable_placeholder`（`read_screen_skill.rs`） | テンプレートの実行ファイル置き換え | MCP-02 |
| `render_uses_localappdata_command_when_path_is_under_it`（`read_screen_skill.rs`） | Local AppData 配下は `"$LOCALAPPDATA/"` と `--screen` の1行にし、`AppData` を残さない | MCP-02 |
| `render_keeps_absolute_path_on_separate_lines_outside_localappdata`（`read_screen_skill.rs`） | Local AppData 配下でない絶対パスは、引用せず引数と別の行に書く | MCP-02 |
| `render_fails_when_executable_path_is_empty`（`read_screen_skill.rs`） | 実行ファイルのパスが空なら置かない | MCP-02 |
| `render_fails_when_placeholder_remains_after_replace`（`read_screen_skill.rs`） | 置換後にプレースホルダが残るなら置かない | MCP-02 |
| `destinations_are_user_skill_dirs_only`（`read_screen_skill.rs`） | read-screen の置き先はユーザー全体の `.cursor`、`.claude`、`.copilot` だけ。`.github` と指定フォルダは含まない | MCP-02 |
| `install_without_replace_leaves_existing`（`read_screen_skill.rs`） | 置き換えを確認するまでは既存を残し、何も書かない | MCP-02 |
| `install_writes_copilot_skill_with_same_invocation_rules` | Copilot へ置く read-screen も、Local AppData 配下でないときは実行ファイルの行と `--screen` の行に分ける | MCP-02 |
| `install_writes_copilot_skill_with_localappdata_one_line` | Copilot へ置く read-screen も、Local AppData 配下は `"$LOCALAPPDATA/"` と `--screen` の1行にし、`AppData` を残さない | MCP-02 |
| `parse_tool_selection_requires_at_least_one_for_read_screen` | ツール未選択は「ツールを1つ以上選んでください。」で失敗 | MCP-02 |
| `install_and_uninstall_skip_copilot_when_dot_copilot_is_symlink`（`read_screen_skill.rs`） | read-screen は `.copilot` がシンボリックリンクなら置かず、外さない | MCP-02 |
| `install_and_uninstall_skip_copilot_when_skills_under_copilot_is_symlink`（`read_screen_skill.rs`） | read-screen は `.copilot/skills` がシンボリックリンクなら置かず、外さない | MCP-02 |
| `uninstall_with_symlink_copilot_does_not_remove_cursor_read_screen`（`read_screen_skill.rs`） | Copilot の親がシンボリックリンクで外すのが失敗したとき、先に置いた Cursor の read-screen は残る | MCP-02 |
| `jsonSkills.test.ts` | `defaultJsonSkillToolSelection` と `hasJsonSkillToolSelection` | SET-05, MCP-02 |
| `install_does_not_write_through_tool_dir_symlink`（`read_screen_skill.rs`） | `.cursor` がシンボリックリンクなら置かない | MCP-02 |
| `mcp_stdio_mode_requires_only_flag` | 引数が `--mcp` だけのとき MCP 起動になる | MCP-01 |
| `tools_list_exposes_screen_tools` | `tools/list` が `open_windows`、読み取り 6 ツール（省略できる `window`）、`current_schedule`、`replace_schedule` を返し、`screen_context` が無い。`selected_tasks` は1件でも配列で、選択数が不明なときはこちらを使うと説明し、`selected_task` は不明なとき `selected_tasks` を使うと説明する | MCP-01 |
| `build_mcp_open_windows_orders_live_and_sets_front`（`window_session.rs`） | 生きているラベルだけを記録順に並べ、`file`・`folder`・`front` を付け、絶対パスを含めない | MCP-01 |
| `build_mcp_open_windows_omits_home_path_segments`（`window_session.rs`） | ホーム配下のパスでも `file`・`folder` は末尾と親だけ。JSON に `/Users` などを含めない | MCP-01 |
| `resolve_mcp_label_with_override_absent_matches_front_resolution`（`window_session.rs`） | `window` 省略時の送り先は `resolve_mcp_screen_window_label` と同じ | MCP-01 |
| `resolve_mcp_label_with_override_ignores_front`（`window_session.rs`） | `window` 指定時は前面でなくそのラベル。無いラベルは前面へ倒さない | MCP-01 |
| `screen_tool_parses_window_on_open_windows_for_rejection`（`screen_cli.rs`） | `open_windows` に `--window` を解析し、失敗文を返す | MCP-02 |
| `screen_tool_parses_window_on_replace_schedule_for_rejection`（`screen_cli.rs`） | `replace_schedule` に `--window` を解析し、失敗文を返す | MCP-02 |
| `screen_tool_accepts_read_window_flag`（`screen_cli.rs`） | `--screen <読み取り> --window <label>` を受け付ける | MCP-02 |
| `screen_tool_rejects_window_on_open_windows`（`screen_cli.rs`） | `open_windows` に `--window` は付けない | MCP-02 |
| `screen_tool_rejects_window_on_replace_schedule`（`screen_cli.rs`） | `replace_schedule` に `--window` は付けない | MCP-02 |
| `mcp_socket_lives_in_app_data` | Unix のソケットはアプリデータ直下 | MCP-01 |
| `mcp_pipe_name_includes_identifier_and_sid` | Windows のパイプ名に identifier と SID が入る | MCP-01 |
| `pipe_roundtrips_length_prefixed_frame` | Windows の名前付きパイプで長さ付き JSON が往復する | MCP-01 |
| `skips_new_listener_when_pipe_is_alive` | 接続できるパイプは取り替えない | MCP-01 |
| `open_pipe_client_with_retry_waits_for_busy_pipe` | 使用中の名前付きパイプは接続を試し直し、解放後に繋がる | MCP-01 |

## 自動テストが無いところ

次のモジュールには、専用のテストが無い。一部は他のテストから間接的に使われる。

| モジュール | 状態 |
| --- | --- |
| `dependencies.ts` | 破綻の境界と系統は未テスト。線の追加、除去、当たり、見えている行のリンク（`outline` のタスク含む）はテストしている。循環の検出は、`taskEditCycles.test.ts` が `scheduleSemantics.ts` 側でもテストしている |
| `timeline.ts` | ズーム段階は未テスト。期限超過とイナズマ線は `statusCatalog.test.ts` から `isOverdue` と `lightningDate` を間接的にテストしている |
| `milestones.ts` | マイルストン超過と段の割り当ては未テスト。追加と削除はテストしている |
| `rows.ts` | ノート、マイルストン、確度以外の絞り込み、`computeVisibleRows`、折りたたみは未テスト。追加と複製で外す絞り込みはテストしている |
| `exportFilename.ts` | 未テスト。Rust 側が似たファイル名処理をテストしている |
| `scheduleFile.ts` | Tauri とブラウザの I/O は未テスト |
| `tasks.ts` | 末尾への追加と削除は未テスト。複製の直後挿入と先行の写しはテストしている |
| `validationMessages.ts` | 文言の組み立ては未テスト |
| `errors.ts` | 未テスト |
| `timelineVisibleDays.ts` | 未テスト |
| `layoutSizes.ts` | 未テスト |
| `src/components/`、`src/hooks/`、`App.tsx` | DOM、Konva、Tauri の操作は未テスト。キーの判断、チャートの当たり、保存の直列化、起動の世代、監視の停止は純粋関数としてテストしている |

足すなら、手間のわりに効果が大きい次の順がよい。

1. `dependencies.ts`。破綻の境界（同じ日は破綻でない）と系統
2. `timeline.ts`。ズーム段階（期限超過とイナズマ線は `statusCatalog.test.ts` で一部あり）
3. `rows.ts`。担当、ステータス、期限、破綻の組み合わせ
4. `tasks.ts`。追加時に外す絞り込みと、削除時の先行の除去

## テスト環境とデータ

| 環境 | 用途 |
| --- | --- |
| デスクトップ版（Ubuntu、Windows。macOS はローカルビルド） | ダイアログ、監視、控え、閉じる確認、インストーラ |
| ブラウザ版（`npm run dev`） | ファイル選択、ダウンロード、localStorage |
| 配布物 | Release の deb と NSIS。CSP は本番ビルドで意味を持つ |

| データ | 内容 | 自動で見るか |
| --- | --- | --- |
| `src/sample/schedule.ts` | タイトル「AI活用PoC推進プロジェクト」。マイルストン 3、カテゴリ 5、グループ 11、タスク 16。割り当てなし 3、ノート 1。前後関係に循環は無い | `npm run check:schedule` |
| `src/sample/members.ts` | メンバー 4人 | 専用の check は無い。初回の起動時に、カタログとして一度だけ入れる |
| `examples/playground.schedule.json` | サンプルと同じタスク構成（ノート無し）。マイルストン帯は3グループ・長い名前・同日重なり用。`tsx scripts/write-playground-schedule.ts` で再生成 | 引数なしの `check:schedule` では見ない |
| `examples/playground.members.json` | サンプルと同じ4人 | `npm run check:members` |
| `examples/jp-2026.calendar.json` | 土日と、非稼働日 18件。振替出勤は空 | `npm run check:calendar` |
| `examples/lightning/workspace.json` | 四つの扱いと一覧に無い `id` の折れと赤。開始前・期間中・終了後は今日が 2026-10-23 から 2026-11-01 のあいだ。終了が今日の行は 2026-10-25 | 引数なしの check では見ない |
| `examples/hierarchy/levels-2.schedule.json` | 2段の `levels` と `outline` | `npm run check:schedule -- examples/hierarchy/levels-2.schedule.json` |
| `examples/hierarchy/levels-3.schedule.json` | 3段の `levels` と `outline` | `npm run check:schedule -- examples/hierarchy/levels-3.schedule.json` |
| `examples/hierarchy/levels-4.schedule.json` | 4段の `levels` と `outline` | `npm run check:schedule -- examples/hierarchy/levels-4.schedule.json` |
| `examples/hierarchy/levels-5.schedule.json` | 5段の `levels` と `outline` | `npm run check:schedule -- examples/hierarchy/levels-5.schedule.json` |
| `examples/fields.schedule.json` | 合成キー `sample_*` の値。タスク 2 件（値あり・値なし） | `npm run check:schedule -- examples/fields.schedule.json` |
| `examples/fields/sample.fields.json` | プラグイン ID `sample` の定義 5 件 | `npm run check:schedule -- examples/fields/sample.fields.json` |
| `examples/fields/workspace.json` | 上記スケジュールと拡張を束ねる設定ファイル | 手動（FILE-10） |

壊れた JSON は、必須項目を消すか、schemaVersion を 2 にして作る。外部からの書き換えは、開いたファイルを別のエディタで保存して作る。

## 手動テストケース

前提に書いていないときは、デスクトップ版を起動し、サンプルが表示された状態から始める。ブラウザ版で結果が違う場合は、そのケースに書く。

| ID | 機能 | 前提 | 手順 | 期待結果 |
| --- | --- | --- | --- | --- |
| TC-HIER-01 | VIEW-03 | `examples/hierarchy/levels-2.schedule.json` など定義の無いファイル | 開いて保存する | 定義の無いファイルは保存後も `levels` と `outline` が付かない。2段・3段・4段・5段のサンプルは帯の上に定義名が並び、段数どおりの行になる |
| TC-HIER-02 | VIEW-03 | 定義と入れ子の段数が合わない JSON | 開く | 「階層の定義と入れ子の数が違います。」が出て、行の組み立ては変わらない |
| TC-HIER-03 | VIEW-03, FILE-01 | `examples/hierarchy/levels-3.schedule.json` | ワークスペースで開く。同じ JSON を直接開く | 階層の見え方が同じである |
| TC-HIER-04 | VIEW-01 | `examples/hierarchy/levels-5.schedule.json` と従来の3段サンプル | ブラウザ版で開く。折りたたみ、絞り込み、系統、カテゴリの並べ替えドラッグを試す | 名前の左端が行の種類にかかわらず揃う。縦線は最大4本でレール幅は段で変わらない。行の境で縦線が切れず、枝の最後の行では中央より下に線が伸びない。折りたたんだ行から下に線が続かない。絞り込みと系統で消えた枝の線が残らない。5段で系統を出すと、起点の先行と後続だけが残る。ドラッグの塊の名前は一覧と同じ列で、塊の外に線が残らない。固定見出しの線と下の行が横で揃う。ライトとダークで線が見える |
| TC-HIER-05 | EDIT-18, EDIT-11 | `examples/hierarchy/levels-2.schedule.json` | 最上段の見出しを右クリックし同じ段を追加する。プルダウンが「見出しを追加」であること。開き、段の選択が無いこと。1件追加する。取り消す | 定義名の下の見出しが自動でつながり、タスクは付かない。一覧の末尾に足る。取り消し1回で戻る |
| TC-HIER-05b | EDIT-18 | `examples/hierarchy/levels-5.schedule.json` | プルダウンが「見出しを追加」1行であること。開き、段は最上段で追加先が無いこと。段を工程にし、追加先が文書順の最後の事業になること。名前を入れて追加する。段をタスクの一つ上にして同様に1件追加する。見出し行の右クリックが従来どおりであること。取り消す | 下の見出しが定義名でつながり、タスクは付かない。タスクの一つ上の枝は子が空である。取り消し1回で戻る |
| TC-HIER-05c | EDIT-18, EDIT-11 | `examples/hierarchy/levels-3.schedule.json` | プルダウンが「見出しを追加」1行であること。開き、段は工程で追加先が無いこと。名前を入れて1件追加する。段を機能にし、追加先が文書順の最後の工程になること。名前を入れて1件追加する。見出し行の右クリックが「下に工程を追加」と「機能を追加」であること。保存する。取り消す | 最上段の追加の下は定義名の「機能」でタスクは付かない。保存後も `categories` にはならない。取り消し1回で戻る |
| TC-HIER-05e | EDIT-18 | サンプル（定義なし） | プルダウンが「見出しを追加」であること。開き、段はカテゴリで追加先が無いこと。名前を入れて1件追加する。段をグループにし、追加先が文書順の最後のカテゴリになること。名前を入れて1件追加する。保存する。取り消す | カテゴリ追加の直後に空の「グループ」ができる。グループは選んだカテゴリの末尾に足る。保存後も `levels` と `outline` が付かない。取り消し1回で戻る |
| TC-HIER-05d | EDIT-18, EDIT-11 | `examples/hierarchy/levels-4.schedule.json` | プルダウンが「見出しを追加」であること。段はタスクを除く3つ。最上段を1件追加する。タスクの一つ上の段でも1件追加する。見出し行の右クリックが定義名のままであること。取り消す | 下の見出しが定義名でつながり、タスクは付かない。取り消し1回で戻る |
| TC-HIER-06 | EDIT-18 | 上記の追加後 | 保存する | タスクの一つ上の枝だけ `children` が空でも検証に通る |
| TC-HIER-02b | VIEW-03 | 中間枝だけ子が空の JSON を手で用意する | 開く | 「階層の定義と入れ子の数が違います。」が出る。見出しの追加メニューは出ない |
| TC-HIER-06b | EDIT-21, FILE-02 | サンプルまたは `levels-3.schedule.json` | ブラウザ版で入口の「階層編集」が枠付きであることを見る。「階層編集」を開き、全段で名前・意味・指示の欄の左端が揃い、最下段の操作列に「タスク」が出ることを見る。見出しの段で「上へ」「下へ」が効くことを見る。名前だけ変えて閉じる。指示だけ書いて閉じ、保存してキーが残ることを見る。段を1つ足して閉じ、保存を試す。意味を空にして閉じられるか試す | 名前か意味だけの変更で段数が同じときは行は動かない。上下は閉じるまで文書は動かない。段数だけ変えたあとは保存が拒否され、ダイアログの見出しは「保存できません」で本文に階層の理由が出る。空の意味では閉じられない。空の指示ではキーを書かない |
| TC-HIER-06c | EDIT-21, SYNC-01 | デスクトップ版で `levels-2.schedule.json` を開く | 「階層編集」を開き、意味の下書きを入れる。別端末で同じファイルのタスク終了日だけを変えて保存する。即時反映せず確認が出ること。下書きが残ること。読み直す。再度「階層編集」を開き下書きを入れ、今度はファイル側だけの変更で「両方を画面へ反映」する | 開いているあいだは即時反映しない。読み直しと反映のあと、閉じたダイアログの下書きは文書へ入らない。反映後は `levels` と `outline` が残る |
| TC-HIER-07 | EXPORT-02, EXPORT-05, VIEW-01 | `examples/hierarchy/levels-2.schedule.json`、`levels-3.schedule.json`、`levels-5.schedule.json` と定義の無いサンプル | 各ファイルを開き、HTML と Excel で書き出す。画面と並べ、左の縦線と行の地、チャートの親バー、Excel の字下げと一番上だけの塗りを見る | 2段は見出しの字下げ 0 とタスク 1、塗りは見出しの左列だけ。3段の `outline` は字下げ 0・1・2 で定義の無い3段と同じ。5段はタスクが字下げ 4。中間の見出しにも親バーが出る。HTML のチャート側の行の地は、一番上・タスクのすぐ上・あいだで分かれる |
| TC-FILE-01 | FILE-01 | 検証済みの JSON がある | 「開く」でそのファイルを選ぶ | 画面がその内容になり、見出しのタイトルは JSON の `title` になる。ファイル名は状態バーとウィンドウタイトルに出る |
| TC-FILE-01c | FILE-01 | 検証済みの JSON がある | ⌘/Ctrl+O でそのファイルを選ぶ | 「開く」と同じように開く。ダイアログが開いているときは効かない |
| TC-FILE-01f | FILE-01 | サンプル | ☰ を開き、下、上、Home、End を押す | 最初の項目にフォーカスが移る。キーで項目を移動できる。Escape で閉じる |
| TC-FILE-01b | FILE-01 | schemaVersion 2 の JSON がある | 「開く」で選ぶ | 開かず、理由が出る。それまでの保存先は変わらない |
| TC-FILE-01d | FILE-01, FILE-04 | schemaVersion 3 で、確度の無い JSON がある | 「開く」で選ぶ。見出しを見てから保存する | 開く。バーと、確度の無いマイルストンのひし形はベタ塗りで、見出しは未保存にならない。保存すると schemaVersion 8 になり、全部のタスクとマイルストンに `confidence` があり、カテゴリとグループに `id` がある。マイルストンがあるときは `milestoneGroups` と `groupId` もある |
| TC-FILE-01e | FILE-01, FILE-04 | schemaVersion 4 で、カテゴリとグループに `id` が無い JSON がある | 「開く」で選ぶ。同じファイルをもう一度開く | どちらも未保存にならない。付けたカテゴリとグループの `id` は同じである。保存すると schemaVersion 8 になる |
| TC-FILE-01g | FILE-01, FILE-04 | schemaVersion 6 の JSON がある | 「開く」で選ぶ。保存する | 未保存にならず開く。保存すると schemaVersion 8 になる。タグを付けていないタスクに `tags` は無い |
| TC-FILE-01h | FILE-01, NAV-03 | 期間の短いスケジュールを開き、一覧を下へ送ったあと、同じウィンドウで期間の長いスケジュールを開く。開始が前の原点より後ろのスケジュールも開く | 1日幅は新しい期間が幅に入る値になる。横位置は先頭。一覧は上端から見える。後ろの開始でも、前の原点の空き日の分だけバーが右へ寄らない |
| TC-FILE-10 | FILE-10 | 設定ファイルとスケジュールがある。任意で `statuses` と `fieldExtensions` を書く | 設定ファイルで開く。通常のウィンドウも同時に開く | 設定ファイルのウィンドウだけメンバー、ステータス一覧、カレンダー、拡張項目がファイル由来になる（`statuses` が無いときは組み込みの三件）。互いにアプリの選択を変えない。同じ設定ファイルを前面にしたときメンバーとステータス一覧とカレンダーだけ読み直す。保存して終了し、起動し直すと設定ファイルのまま戻り、拡張項目も設定ファイルの定義どおりである |
| TC-FILE-11 | FILE-11 | ユーザ設定モードでスケジュールを開き、メンバーとステータス一覧とカレンダーと拡張項目を選んでいる | ☰ の「設定ファイルを新しいフォルダへ書き出す」で空のフォルダを選ぶ | `workspace.json` と各 JSON ができ、組み込みの三件のときは `statuses` を書かない。選んだ拡張は `fieldExtensions` に選んだ順で並び、各 `プラグインID.fields.json` が同じフォルダにある。拡張を選んでいないときは `fieldExtensions` を書かず、知らせにその旨が出る。今のウィンドウはユーザ設定モードのまま。成功の知らせが出る |
| TC-FILE-09 | FILE-09 | デスクトップ版。検証済みの JSON を複数ある | 「開く」、新しいウィンドウ、ドロップ、アイコンから順に開く | ☰ と macOS のファイルメニューでは「最近開いたファイル」のサブメニューにスケジュールと設定ファイルを別グループで新しい順に並び、区切りの下に「履歴を消す」がある。コマンドパレットに新しい順で並ぶ。☰ のサブメニューで項目にマウスを乗せると絶対パスが出る。同じファイルをもう一度開くと1件のまま先頭へ移る |
| TC-FILE-09b | FILE-09 | 上記のあと6件目を開く。同名のファイル名を2つのフォルダから開く | 一覧の件数と親フォルダの付き方を見る | 5件を超えた古いものが消える。同じファイル名が2件以上のときだけ親フォルダ名が付く |
| TC-FILE-09c | FILE-09 | 履歴にパスがある | 存在しないパスを選ぶ。未保存のあいだに履歴から開き、キャンセルする | 画面と保存先は残る。サンプルに戻らない。項目は残る。キャンセルでは順番が変わらない |
| TC-FILE-09d | FILE-09 | 履歴がある | ☰ または macOS のファイルメニューで「最近開いたファイル」から「履歴を消す」を押す。ファイル操作の途中でサブメニューから開く操作を試す | パスだけ消える。開いているスケジュールと次回起動のウィンドウ・控え・絞り込みは残る。操作中は履歴から開けず、「履歴を消す」は押せる。消したあと、☰ と macOS のファイルメニューに「最近開いたファイル」の行は残り、押せず、サブメニューは開かない |
| TC-FILE-09e | FILE-09 | 履歴から開く、または `recent-files.json` を壊す | 絞り込み・折りたたみ・系統・選択を変えたあと履歴から開く。別ウィンドウでも一覧を見る。壊れて一覧が空のとき ☰ を開く | 絞り込みなどが初期状態になり Fit する。壊れた JSON では一覧が空で知らせは出ない。別ウィンドウでも同じ一覧。一覧が空のとき、☰ と macOS のファイルメニューに「最近開いたファイル」の行は残り、押せず、サブメニューは開かない |
| TC-FILE-09f | FILE-09 | ブラウザ版、`npm run dev` | ☰ と ⌘/Ctrl+K を開く | 最近開いたファイルも「履歴を消す」も出ない |
| TC-FILE-08 | FILE-08 | デスクトップ版。検証済みの JSON がある | その JSON をウィンドウへ1つ落とす | 「開く」と同じ内容になる。ファイルダイアログは出ない |
| TC-FILE-08b | FILE-08 | 未保存の編集がある | 別の検証済み JSON を同じウィンドウへ落とす | 破棄の確認が出る |
| TC-FILE-08c | FILE-08 | サンプル | JSON を2つ、またはフォルダと JSON をまとめて落とす | 開かず「スケジュールの JSON を1つだけ落としてください。」が出る |
| TC-FILE-08d | FILE-08 | 開くダイアログを開いている | JSON を1つ落とす | 開かず「画面の操作が途中なので、開けません。」が出る |
| TC-FILE-08e | FILE-08 | ブラウザ版、`npm run dev` | JSON をページへ落とす | ファイルは開かず、ブラウザがそのファイルへ移らない |
| TC-FILE-08f | FILE-08 | デスクトップ版。設定またはタスク編集のダイアログを開いている | JSON をウィンドウへ1つ落とす | 開かず「画面の操作が途中なので、開けません。」が出る |
| TC-FILE-08g | FILE-08 | デスクトップ版 | タスクバーの上と並べ替えの握りの上へ JSON を通して落とす | チャートの移動と並べ替えは始まらない |
| TC-FILE-02 | FILE-02 | ファイルを開き、バーを動かして未保存にする | 「保存」を押す | 見出しから「未保存」が消え、ファイルの内容が画面と一致する |
| TC-FILE-02c | FILE-02 | 同上 | ⌘/Ctrl+S を押す。検索欄にフォーカスがあるときも押す | 「保存」と同じように保存される。モーダルダイアログが開いているときは保存されない |
| TC-FILE-03 | FILE-03 | サンプルを編集する | 「別名保存」で新しいパスを選ぶ | そのパスに JSON ができ、次の「保存」はそのパスへ書く |
| TC-FILE-03b | FILE-03 | サンプルを編集する | ⌘/Ctrl+Shift+S で新しいパスを選ぶ | 「別名保存」と同じになる |
| TC-FILE-04 | FILE-04 | ファイルを開いた直後 | 絞り込みだけを変える | 見出しは「未保存」にならない |
| TC-FILE-04b | FILE-04 | ファイルを開いている | バーを1日動かす | 見出しが「未保存」になる |
| TC-FILE-05 | FILE-05 | サンプルを編集し、未保存にする | ウィンドウを閉じる | 破棄して閉じるかを聞く。破棄すると控えは残らない |
| TC-FILE-05b | FILE-05 | パスがあるファイルを未保存のままにする | ウィンドウを閉じる | 確認なしで閉じ、次回その未保存を戻せる |
| TC-FILE-05c | FILE-05 | サンプルが未保存のウィンドウと、別の保存済みウィンドウ | 終了を選び、サンプルの確認をキャンセルする | どちらのウィンドウも閉じない |
| TC-FILE-06 | FILE-06 | タスク名を変えた直後 | 「JSON を表示」を開く | 保存と同じ形で、変えた名前が見える。ファイルは増えない |
| TC-FILE-07 | FILE-07 | パスのあるファイルを開き、タスクの日付をずらす | 何も押さない。右の取っ手を見る | 差分の取っ手だけ出る。取っ手を押して列を開くと、そのタスクの start と end の旧値、新値、暦日の差が出る。一覧とチャートを操作できる |
| TC-FILE-07b | FILE-07 | 差分列に差の本文が出ている | 列の「コピー」を押す | 列の全文が写る。ファイルは増えない |
| TC-FILE-07c | FILE-07 | 差分の出る編集をしたあと保存する | 「差分を表示」を押す | 列に「差はありません」が出る。「閉じる」で列がしまう。保存直後は取っ手も出ない |
| TC-FILE-07m | FILE-07 | パスのあるファイルを開き、「差はありません」を列に出す | 差の出る編集をする | 列が差の本文になり、「閉じる」が「畳む」になる |
| TC-FILE-07n | FILE-07 | サンプルで「比べるファイルがありません」を列に出す | ファイルを開く | 列がしまう |
| TC-FILE-07o | FILE-07 | 絞り込みでタスクを隠し、見えているタスクだけ日付をずらす | 列を開き本文を見る | 絞り込みで隠れている変更も本文に残る |
| TC-FILE-07p | FILE-07 | 差分の取っ手が出ている | 取っ手で列を開く。「畳む」で取っ手に戻す。⌘/Ctrl+Shift+D を押す | 畳んでも一覧とチャートを操作できる。コピーキーで全文が写り、列は開かない |
| TC-FILE-07q | FILE-07 | パスのあるファイルを開き、差分の一覧が列の高さを超える | 列を開き、一覧をスクロールする | 見出しの下の一覧だけが縦にスクロールする |
| TC-FILE-07r | FILE-07 | タスクを選び詳細パネルが開いている。差分の取っ手が出ている | 取っ手で差分列を開く | チャートの幅は、詳細パネルと差分列を除いた残りになる |
| TC-FILE-07s | FILE-07 | 差分列に差の一覧が出ている | 一覧をクリックしてフォーカスする。↑↓を押す。行を押して寄せる。チャートをクリックしてフォーカスを戻す。↑↓を押す | 一覧にフォーカスがあるあいだは↑↓でタスク選択が動かない。↑↓で差分の行が移り、開いた行の本文が替わる。行を押したときだけチャートが寄る。チャートに戻すと↑↓で選択が動く |
| TC-FILE-07v | FILE-07 | パスのあるファイルを開き、差分の一覧が出ている。タスクを変更した。別のタスクを2件以上選択している | 変更の行を押す | 一覧の行が開き、対象へ寄る。選択件数と一括パネルは変わらない |
| TC-FILE-07w | FILE-07 | パスのあるファイルを開き、タスクを削除して差分の一覧を出す | 削除の行を押す | 画面に残っている親のグループ行へ寄り、親の行に薄い帯が付く。消えたタスクのバーは出ない |
| TC-FILE-07x | FILE-07 | 差分の一覧が出ている。変更対象が折りたたみまたは絞り込みで見えない | その行を押す | チャートは動かず、行に「折りたたみで隠れています」または「絞り込みで出ていません」が出る |
| TC-FILE-07y | FILE-07 | 差分の一覧が出ている。マイルストンまたはマイルストングループの変更で、帯の線がオフ | その行を押す | チャートは動かず、行に「帯の線がオフ」が出る |
| TC-FILE-07t | FILE-07 | 差分列が開いている | 列の「コピー」を押す | 隅の知らせは差分列の左に出る。列の上に重ならない |
| TC-FILE-07u | FILE-07 | 差分の取っ手が出ている | 取っ手にフォーカスし Enter で列を開く。畳む。取っ手をクリックで開く | Enter で開いたあとは一覧にフォーカスする。クリックで開いたあとはチャートにフォーカスが戻る |
| TC-FILE-07d | FILE-07 | パスのあるファイルを開いている | タスクを追加する | 場所と全フィールドが出て、兄弟の並びは出ない |
| TC-FILE-07j | FILE-07 | パスのあるファイルを開いている | 新しいタスクを、既存のタスクのあいだに追加する | 追加のブロックと、並びの行が出る。右辺に新しいタスクが含まれる |
| TC-FILE-07e | FILE-07 | 先行を持つタスクがある | その先行タスクを削除する | 削除したタスクと、先行から外れた残りのタスクの変更が出る。空のグループは削除にならない |
| TC-FILE-07f | FILE-07 | パスのあるファイルを開いている | タスクを削除し、同じ名前で追加する | 削除と追加の二つになる |
| TC-FILE-07g | FILE-07 | 未保存の編集を残したまま、外部の更新を「画面の編集を残す」にした | 「差分を表示」を開く | 今のファイルとの差が出る |
| TC-FILE-07h | FILE-07 | サンプル、またはブラウザ版 | 「差分を表示」を押す | 列に「比べるファイルがありません」が出る。「閉じる」で列がしまう |
| TC-FILE-07i | FILE-07 | 開いているパスのファイルを、検証に失敗する内容へ変える | 「差分を表示」を開く | 差分は出ず、読み込みエラーになる |
| TC-FILE-07k | FILE-07 | パスのあるファイルを開き、未保存にする | 状態バーの「未保存」を押す | 差分列が開き結果が出る。ダイアログは開かない |
| TC-FILE-07l | FILE-07 | パスのあるファイルを開き、編集する | ⌘/Ctrl+Shift+D を押す | 差分の全文がコピーされる。列は開かない。開く、保存、別名保存の途中は効かない |
| TC-SYNC-01 | SYNC-01 | デスクトップ版でファイルを開き、未保存は無い | 別のエディタでその JSON を保存する | 約1.5秒以内に画面に反映し、「ファイルを反映しました」と出る |
| TC-SYNC-01b | SYNC-01 | 未保存の編集がある | 別のエディタでファイルを保存する | 「ファイルが更新されています」が開く。残すと「ファイルに更新あり — 確認する」が出る |
| TC-SYNC-01e | SYNC-01 | 未保存と外部更新。画面とファイルが別タスクだけ変わる | 確認を開く | 「画面」と「ファイル」の節に分かれ、変わった項目が見える |
| TC-SYNC-01e2 | SYNC-01 | TC-SYNC-01e のあと | 「両方を画面へ反映」→保存 | 両方の変更が画面に入り、保存後にファイルと一致する |
| TC-SYNC-01f | SYNC-01 | 未保存と外部更新。同じタスクで画面とファイルがぶつかる | 確認を開く | 「依頼文をコピー」があり、「両方を画面へ反映」は無い |
| TC-SYNC-01k | SYNC-01, MCP-01 | TC-SYNC-01f の確認を開いたまま | `replace_schedule` で検証済み JSON 全体を置き換える。同じ内容でもう一度呼ぶ。取り消しする | 1 回目は確認が閉じ、未保存になり、約 4 秒「画面に反映しました。内容を確認して、問題なければ保存してください。」が出る。ファイルは変わらない。「ファイルに更新あり — 確認する」は出ない。2 回目は未保存も履歴も変わらないが差分テキストは成功で返る。取り消しで「ファイルに更新あり — 確認する」が戻る |
| TC-SYNC-01g | SYNC-01 | TC-SYNC-01e のあと取り消し | — | 「ファイルに更新あり — 確認する」が戻る |
| TC-SYNC-01h | SYNC-01 | TC-SYNC-01e2 のあと、別の編集をして取り消し | — | 確認の帯は出ない |
| TC-SYNC-01i | SYNC-01 | TC-SYNC-01g のあとやり直し | — | 確認の帯が消える |
| TC-SYNC-01j | SYNC-01 | 反映のあと保存してから取り消し | — | 確認の帯は戻らない |
| TC-SYNC-01c | SYNC-01 | ブラウザ版でファイルを開く | 別のエディタでファイルを保存する | 画面は変わらない |
| TC-SYNC-02 | SYNC-02 | 開いたあと、別のエディタでファイルを変える | 「保存」を押す | 「上書き保存」「別名保存」「取り消し」が出る。取り消しではファイルも画面も変わらない |
| TC-SYNC-03 | SYNC-03 | TC-FILE-05b のあと、ファイルは変えない | アプリを起動する | 同じファイルが未保存のまま開く |
| TC-SYNC-03b | SYNC-03 | 控えがあるあいだに、別のエディタでファイルを変える | アプリを起動する | 「ファイルを開く」か「未保存の編集を戻す」かを聞く。開くはダイアログにせず、そのファイルの最新内容になる |
| TC-SYNC-03c | SYNC-03 | 未保存のまま閉じたあと、対象ファイルを消す | アプリを起動する | 未保存が画面に戻り、ファイルが無いと出る。「未保存の編集を戻す」でその内容が残る。そのあと、同じ欠落では監視のファイルダイアログは出ない |
| TC-SYNC-03d | SYNC-03 | ファイルを開き、保存して閉じる | アプリを起動する | 同じファイルが保存済みで開く。ズームは初期状態である |
| TC-SYNC-03h | SYNC-03 | パスのあるファイルで担当者とタグを絞り、保存済みのまま閉じる | 起動する | 同じ絞り込みが戻り、未保存にはならない |
| TC-SYNC-03o | SYNC-03 | マイルストングループが2つ以上ある JSON で、帯の線を1つ以上オフにし、保存済みのまま閉じる | 起動する | 同じ帯の線の札が戻り、未保存にはならない |
| TC-SYNC-03p | SYNC-03 | カテゴリとグループを折りたたみ、保存済みのまま閉じる | 起動する | 同じ開閉が戻り、未保存にはならない |
| TC-SYNC-03q | SYNC-03 | 折りたたんだあと ☰ の「開く」で別のファイルを選ぶ | 起動する | 開いたファイルはすべて展開である |
| TC-SYNC-03i | SYNC-03 | 未保存の編集と絞り込みがある状態で閉じる | 起動する | 編集と絞り込みの両方が戻る |
| TC-SYNC-03j | SYNC-03 | 絞り込みだけ変えて閉じる | 起動する | 未保存にならない |
| TC-SYNC-03k | SYNC-03 | 「開く」で別のファイルを選ぶ | 起動する | 開いたファイルの絞り込みは初期値である |
| TC-SYNC-03l | SYNC-03 | マイルストンで絞ったあと、そのマイルストンをファイルから消して閉じる | 起動する | マイルストンの条件は「すべて」になる。取り消しでは戻らない |
| TC-SYNC-03m | SYNC-03 | 同じパスを2つのウィンドウで開き、前面だけ条件を変えて閉じる | 起動する | 前面の条件だけが戻る |
| TC-SYNC-03n | SYNC-03 | ブラウザ版で絞り込みを変えて閉じる | ページを開き直す | 絞り込みは戻らない |
| TC-SYNC-03e | SYNC-03 | 保存して閉じたあと、そのファイルを消す | アプリを起動する | 見つからないと知らせてサンプルになる。ファイルダイアログは出ない。その状態で閉じると、次はサンプルのままである |
| TC-SYNC-03f | SYNC-03 | 保存済みのファイルを閉じた直後 | アプリを起動し、起動復旧が終わる前にバーをドラッグする | 復旧が終わるまで日付は変わらない。終わったあとはドラッグできる |
| TC-SYNC-03g | SYNC-03 | 保存済みのファイルを閉じた直後 | アプリを起動し、起動復旧が終わる前に別のエディタでその JSON を保存する。復旧が終わったあと少し待つ | 変えた内容が画面に出る。起動が終わったあとはバーをドラッグできる |
| TC-WIN-01 | WIN-01 | デスクトップ版。検証済みの JSON がある | 「新しいウィンドウで開く」で選ぶ | 元のウィンドウは残り、新しいウィンドウにその内容が開く。Windows では新しい窓が白いまま止まらず、元の窓も操作できる |
| TC-WIN-01b | WIN-01 | 同上 | ⌘/Ctrl+Shift+O で選ぶ | 同上。ブラウザ版ではブラウザのショートカットになる |
| TC-WIN-01c | WIN-01 | 未保存の編集がある | 「新しいウィンドウで開く」 | 破棄の確認は出ず、新しいウィンドウだけ開く |
| TC-WIN-01d | WIN-01 | 起動済み。検証済みの JSON がある | 「新しいウィンドウで開く」で選ぶ | 元のウィンドウは残り、新しいウィンドウに開く。アプリは終了しない |
| TC-WIN-01e | WIN-01, SYNC-03 | 2 ウィンドウ。追加した側だけ残して終了 | 起動する | 記録どおり 1 枚だけ開く |
| TC-WIN-01f | WIN-01, SYNC-03 | 2 ウィンドウ。元の `main` を閉じ、追加側だけ残して終了 | 起動する | 空の `main` は一緒に開かず、残したウィンドウだけ開く |
| TC-WIN-01g | WIN-01, MCP-01 | 別々のファイルを 2 ウィンドウで開き、それぞれ別のタスクを 1 件選んでから、返す側を前面にする | `selected_task` を呼ぶ | 前面の選択タスクが返る。背面の選択は返らない |
| TC-WIN-01h | WIN-01, FILE-10 | デスクトップ版。設定ファイルと schemaVersion 6 のスケジュールを束ねた例がある | 「新しいウィンドウで開く」で設定ファイルを選ぶ。続けて schemaVersion 6 のスケジュール JSON を選ぶ | 元のウィンドウは残る。新しいウィンドウは設定ファイルの束縛で開き、メンバーとステータスとカレンダーと拡張がそのウィンドウだけに効く。履歴に設定ファイルだけが足り、スケジュールパスは足らない。もう一つの新しいウィンドウは schemaVersion 6 を移行して開き、未保存にならない |
| TC-WIN-02 | WIN-02 | 同じファイルを2つのウィンドウで開く。片方は未保存 | 未保存の側で外部更新を「画面の編集を残す」にする | もう一方の隅に「確認待ち」が出て、確認が終わるまで残る。押すと、確認を出したウィンドウが前面になる。確認を終えると知らせは消える |
| TC-WIN-02b | WIN-02 | 同じファイルを2つ開く。両方保存済み | 片方で外部更新を即時反映する | もう一方の隅に「反映した」が数秒出る |
| TC-WIN-03 | SET-02, SET-01, SET-04 | 2つのウィンドウを開く | 片方でメンバー、表示サイズ、配色、一覧の幅、行の密度、イナズマ線、一覧の列を変える | もう一方も同じ設定になる |
| TC-WIN-04 | WIN-04 | デスクトップ版。アプリを終了している。検証済みの JSON がある | JSON を Dock またはアプリのショートカットへ落とす | 起動と復元のあとそのファイルが開く |
| TC-WIN-04b | WIN-04 | 起動済み。同じ JSON を2つのウィンドウで開いている。片方だけ未保存 | その JSON を Dock へ落とす | 前面順の新しいウィンドウが前面になる。読み直さず未保存も残る |
| TC-WIN-04c | WIN-04 | 起動済み。別ファイルを開いている | 別の検証済み JSON を Dock へ落とす | 新しいウィンドウで開く。元のウィンドウの未保存確認は出ない |
| TC-WIN-04d | WIN-04 | 起動済み。開くダイアログを開いている | JSON を Dock へ落とす | 前面に出るが開かず「画面の操作が途中なので、開けません。」が出る |
| TC-WIN-04e | WIN-04, SYNC-03 | 起動時に復旧の確認が出る状態。検証済みの JSON がある | JSON を Dock へ落とす | 確認が閉じるまで開かない。忙しい旨は出ない。閉じたあとそのファイルが開く |
| TC-WIN-04f | WIN-04 | 起動済み。同じ JSON をすでに開いている | その JSON をもう一度 Dock へ落とす | 同じパスのウィンドウが前面になる。読み直さない |
| TC-WIN-04g | WIN-04 | 起動済み | フォルダだけ、またはフォルダと JSON を Dock へ落とす | 開かず「スケジュールの JSON を1つだけ落としてください。」が出る |
| TC-FILE-02d | FILE-02, SYNC-02 | 開いたあと、別のエディタでファイルを変える | 「ファイルが更新されています」が出るまで ⌘/Ctrl+S を続けて押す | 確認は一つだけ出る。上書きは一回だけ行われる |
| TC-SYNC-01d | SYNC-01 | デスクトップ版でファイルを開いている | そのファイルを消し、連続して読めなくなるまで待つ | ファイルダイアログが出る。読み取り失敗の汎用メッセージは出ない。キャンセルすると見出しのファイル名は残る。上書き保存はできず、別名保存はできる |
| TC-VIEW-01 | VIEW-01 | サンプル | 左の行を上から見る | カテゴリ、グループ、タスクの順で、JSON の配列順に並ぶ |
| TC-VIEW-02 | VIEW-02 | 進行中のタスクがある | そのバーを見る | 薄青の地に、進捗率の濃い部分がある。完了は緑、未着手は灰 |
| TC-VIEW-03 | VIEW-03 | 子の期間が離れているグループ | 親の行を見る。HTML で書き出す | タスクバーより細い帯で、途切れた期間は点線、つながる期間は塗り。両端に下向きの角がある。書き出しも同じ |
| TC-VIEW-03b | VIEW-03 | カテゴリとグループにタスクがある JSON。進捗 0% のタスクと完了タスクがある。設定の表示で左の追加列の進捗をオンにする | ブラウザ版で左のカテゴリ行とグループ行を見る。一覧の幅を最小幅まで狭める。絞り込みか折りたたみか系統で一部のタスクを隠す。タスクが無い空のグループ行も見る | 名前の直後に整数のパーセントが出る。最小幅でもパーセントが切れない。0% も出る。タスクが無い行には出ない。追加列の進捗はタスク行だけ。隠れたタスクも平均に入るので、見えているバーだけを足した数字や親バーの長さとずれてよい |
| TC-VIEW-04 | VIEW-04 | playground または長い名前のマイルストンがある JSON | 右端まで横スクロールする。月表示でも見る。全角24文字を超える名前にカーソルを乗せる。近いひし形の手前で切れる名前も見る。日・週・月を切り替える | 右端まで送ったとき、次のひし形が無い名前と年月が最後まで読める。全角24文字を超える名前は「…」になり、ホバーでチャート内に全文が読める。近いひし形の手前で切れることと、日・週・月の切り替えは今までどおり。グループごとに帯が積まれる。ひし形が重なるときだけ段が増える。左はグループ名。チャート全体の縦線は無い |
| TC-FILTER-11 | FILTER-11 | マイルストングループが2つ以上ある JSON | 絞り込みの帯の線で1つをオフにする。書き出す | 帯と書き出しからその線が消える。タスク行は変わらない。札とすべて解除で戻る |
| TC-FILTER-11b | FILTER-11, EDIT-11 | マイルストングループが2つ以上あり、各グループにマイルストンがある JSON | 左のマイルストングループ名の行の空きを右クリックし「非表示」を選ぶ。札を押す。別の行で「この行だけ表示」を選ぶ。残った1行を右クリックし、メニューを見る。そのあと最後の1行も非表示にする。書き出す | 帯と左の行が消える。札でそのグループだけ戻る。「この行だけ表示」で他がオフになり、オフしたグループごとに札が出る。帯に別のグループ行が無くなったあとは、「この行だけ表示」は出ない。全部オフで帯の高さは0。ひし形の右クリックメニューは今どおり。線を引くモードと見出しではメニューが出ない。タスクの選択は変わらない |
| TC-VIEW-04b | VIEW-04, VIEW-12 | 未確定と確定のマイルストンがある | ひし形を、ライトとダークで見る。HTML と SVG に書き出す | 未確定は斜線、確定は塗りつぶし。書き出しも同じ |
| TC-VIEW-05 | VIEW-05 | `examples/lightning/workspace.json` を開く。終了後の行は今日が 2026-10-23 から 2026-11-01 のあいだ。終了が今日の行は今日が 2026-10-25 | 終了後と、終了が今日のバーを見る | 終了後の未着手と着手済みだけ枠が赤い。完了と中止と管理外と一覧に無い `id` は赤くならない。終了が今日の行は赤くならない |
| TC-VIEW-06 | VIEW-06 | 対応マイルストンより終了日が後のタスクと、当日で終わるタスク | 行を見る | 後のタスクだけ、右が半透明の赤になり「超過」が出る |
| TC-VIEW-07 | VIEW-07 | `examples/lightning/workspace.json` を開く。開始前・期間中・終了後は今日が 2026-10-23 から 2026-11-01 のあいだ。終了が今日の行は今日が 2026-10-25 | 橙の線を見る | 未着手は今日・開始・終了、着手済みは開始・今日・終了、完了は終了・終了・今日、管理外と一覧に無い `id` はどの期間でも今日。確認待ちは着手済みと同じ位置へ折れる。進捗 20 と 80 の終了後は折れ先が同じ。終了日が今日の行は終了より先へ折れない |
| TC-VIEW-08 | VIEW-08 | 後続の開始が先行の終了より前の組と、同じ日に始まる組 | 線を見る | 先行の終了より前に始まる組の線だけが赤い。どちらかを折りたたむと線は消える |
| TC-VIEW-08b | VIEW-08 | 先行と後続が見えている | 後続の開始を超えるまで先行の終了を延ばし、離す前に線を見る。同じ日まで戻してから離す | 離す前に赤く太くなる。同じ日では赤くならない。離してから「前後: 破綻のみ」に入る |
| TC-VIEW-08c | VIEW-08 | 先行の終了と後続の開始が数日以内の組 | 月表示まで縮小して線を見る。週表示でも見る | どちらの表示でも矢印の頭が後続バーの左の外にあり、後続の行へ向かう線が分かる |
| TC-VIEW-09 | VIEW-09 | カレンダー未設定で日表示 | 背景を見る | 土日だけが薄い灰。月表示では日ごとに塗らない |
| TC-VIEW-10 | VIEW-10 | 使用中カタログがある | 割り当てなし、一致する ID、存在しない ID の行を見る。割り当てなしを選択し、カーソルを乗せる。期限超過の割り当てなし行も見る。ライトとダーク、HTML と SVG の書き出しも確かめる | 一覧では「未割当」は琥珀色の札で切れず、名前付きは薄い文字、一致は表示名、「メンバー不明」と ID は紫の札。選択中とホバーでも札の地色が残る。期限超過でも「未割当」は赤くならない。チャートのバーに破線や上端の色は出ない。書き出しも同じ札である |
| TC-VIEW-11 | VIEW-11 | ノートがあるタスクと無いタスク | ノートアイコンを押す | 色が違い、本文が出る。無いタスクは「ノートはありません」 |
| TC-VIEW-10b | VIEW-10, EDIT-04 | 二人以上の担当を付けたタスクがある。同名の表示名を持つメンバーがいる | 左一覧と棒の右の文字列を見る。担当列にマウスを乗せる | 表示名が「、」でつながり、同名のときだけその位置に id が付く。左は先頭8文字までで省略され、マウスで全文が出る。棒の右は切らず、マウスを乗せても全文は出ない |
| TC-EDIT-04s | EDIT-04 | タスクを1件選ぶ | 詳細で担当を足し、外し、順を変え、それぞれ取り消す | 左一覧と棒の右がその都度変わる。各操作の取り消し1回で戻る |
| TC-EDIT-04t | EDIT-04 | 担当の並びが違うタスクを2件選ぶ | 「複数の値」と「未割当にする」を見る。未割当にして適用し、取り消す。別途、並びを変えて適用し取り消す | 並びが違うときは人の行は出ず、未割当の下書きで全件が空になる。適用で選んだ作業の担当が置き換わる。取り消し1回で全部戻る |
| TC-EDIT-04u | EDIT-04, FILE-10 | 設定ファイルのメンバーにだけいる id を担当に付けたタスクがある。アプリ設定のメンバー一覧には同じ id が無い | 左一覧の担当列と、詳細・一括・複製の担当欄を見る。詳細で候補から同じ一覧の人を足す | 左一覧と同じ表示名になる。「メンバー不明」にはならない。候補も左一覧が参照しているメンバー一覧と同じである |
| TC-NAV-01 | NAV-01 | 期間が画面より広い | チャートをドラッグする。チャート本体、日付の行、マイルストン帯で、クリックせず二本指を横へ滑らせる。ホイールと Shift+ホイールも試す | ドラッグは縦横。本体ではホイールの縦は上下、横の量は左右。斜めは一緒に動く。日付の行とマイルストン帯では縦と横の量が左右。Shift+ホイールは横。端で止まる |
| TC-NAV-01b | NAV-01 | 期間が画面より広く、行が画面より多い | ⌘ または Ctrl を押しながら上下左右を押す。押し続ける。端まで押す | 上で縦に戻り、下で進む。左で過去、右で未来へ動く。縦は左の一覧と一緒に動く。上下は 1 行分、左右も同じ画面上の距離である。押しているあいだは連続して動き、端で止まる |
| TC-NAV-01c | NAV-01 | 検索欄、選択欄、またはボタンにフォーカスがある。別途、ダイアログと右クリックメニューを開く | 矢印キーだけを押し、続けて ⌘ または Ctrl と矢印を押す | 矢印キーだけではその欄の操作のままである。⌘ または Ctrl と矢印ではチャートが動く。ダイアログが開いているあいだは動かない。右クリックメニューは、この操作で閉じる |
| TC-NAV-01d | NAV-01 | 行が画面より多い。別途、一覧が画面に収まるスケジュールと、折りたたんだカテゴリまたはグループ | 縦にスクロールする。次の見出しが上へ来るまで進める。折りたたんだ行の下も見る。一覧が画面に収まるときはスクロールしない | 展開中のカテゴリとグループが、日付ヘッダーとマイルストン帯の下に残る。次の見出しで入れ替わる。折りたたんだ行は残らない。一覧が画面に収まるときは残らない |
| TC-NAV-01f | NAV-01 | `examples/hierarchy/levels-5.schedule.json` を開き、各段を展開する | スクロールする前に、階層2と3の見出し行の左の名前と右の親バーを見る。設定でライトとダークを切り替える。深いタスクのあいだまで縦にスクロールする。同じ段の次の見出しが来る位置も見る | スクロールしていない中間の見出しにも、見えている子があるときは最上段と同じ親バーが出る。見ている枝の見出しが浅い方から段の数だけ残る。残した見出しにも、見えている子があるときは親バーが出る。中間の見出しの左の名前の地は、固定していないときも固定したときも、ライトとダークの両方で透けない。同じ段の次の見出しで、その段だけ入れ替わる。固定見出しの縦線と下の行が横で揃う |
| TC-NAV-01e | NAV-01, NAV-02 | 行が画面より多く、期間が画面より広い | 左の名前の一覧の上で、クリックせず二本指を横へ滑らせる。ホイールと Shift+ホイールを試す。さらに Ctrl または ⌘ とホイールを回す | ホイールの縦で左の一覧とチャートが一緒に上下へ動く。横の量では左右へ動く。Shift+ホイールでは横へ動く。Ctrl または ⌘ とホイールでは、チャートの左端の日付を保って拡大・縮小する |
| TC-NAV-02 | NAV-02 | 週表示 | Ctrl または ⌘ を押してホイールを回す | ポインタの位置を保ったまま拡大し、十分拡大すると「日表示」、縮小すると「月表示」になる |
| TC-NAV-02b | NAV-02 | サンプル | 「日」「週」「月」を順に押す | 1日あたりの幅が 40px、22px、8px になり、見出しの表示単位が切り替わる |
| TC-NAV-02c | NAV-02 | 今日が期間内 | 「今日」を押す | 縦位置と選択は変わらず、横スクロールだけが今日が見える位置へ動く |
| TC-NAV-02d | NAV-02 | 期間が複数月にまたがる | 月表示にする。左端が前の月のまま、次の月の1日が左へ寄る位置まで横スクロールする。表示サイズを 50% と 200% にし、隣の月と左端の固定月のあいだに隙間が残ることを確かめる。表示サイズを大きくし、1日の幅を 3px まで縮める。日表示と週表示にも切り替える | 重なる月の文字だけが消え、左端の固定月と月の区切り線は残る。50% と 200% では隣の月の文字のあいだに隙間が残る。縮小して隣の月が重なるときも同じ。日表示と週表示の見出しは変わらない |
| TC-NAV-03 | NAV-03 | 横にスクロールした状態 | 「全体」を押す | 期間が幅に入り、横位置が先頭に戻る |
| TC-NAV-03b | NAV-03, FILE-01 | TC-FILE-01h のあと、一覧を下へ送る | 「全体」を押す | 1日幅と横位置は Fit のまま。一覧の縦位置は動かない |
| TC-NAV-07 | NAV-07 | サンプルを開く | ⌘/Ctrl+K で「今日」を実行する。ほかのダイアログを開いたあいだ ⌘/Ctrl+K を押す | 今日が見える位置へ横が動く。パレットは開かない |
| TC-NAV-07b | NAV-07 | 未保存にする | コマンドパレットで「差分をコピー」を実行する | 差分がコピーされる |
| TC-NAV-07c | NAV-07 | macOS のデスクトップ版 | メニューバーの「ファイル」から「保存」を選ぶ | ☰ と同じ保存が走る |
| TC-NAV-04 | NAV-04 | タスクがあるグループ | 三角を二度押す | 一度で配下の行が隠れ、親バーは残る。二度で戻る |
| TC-NAV-05 | NAV-05 | 左の幅に収まらないタスク名 | その名前にマウスを乗せる。名前をドラッグする | 全文が出る。名前は動かない。担当と「超過」は動かない |
| TC-NAV-06 | NAV-06 | 左の一覧とチャートの境界 | 境界を横にドラッグし、ダブルクリックする。ウィンドウを狭めてから広げる | 一覧の幅が変わり、チャートは残った幅に合う。ダブルクリックで既定の幅に戻る。切れた名前の全文は残る。ウィンドウを狭めると表示だけ縮み、広げると戻る |
| TC-NAV-06b | NAV-06 | 境界にフォーカスがある | 左右キーを押す。続けて ⌘ または Ctrl と左右を押す。さらに Shift または Alt も一緒に押す | 左右キーだけでは幅が変わる。⌘ または Ctrl を押すと幅は変わらず、チャートが横にスクロールする。Shift または Alt も一緒のときは、幅もスクロールも変わらない |
| TC-FILTER-01 | FILTER-01 | サンプル | タスク名の一部を入れる | その文字を含むタスクだけが残る |
| TC-FILTER-01b | FILTER-01 | サンプル。検索の対象が「名前」 | ⌘/Ctrl+F を押す | 検索欄にフォーカスが移り、入っている文字が選択される |
| TC-FILTER-01c | FILTER-01, FILTER-03 | サンプル | 担当者を変え、検索も入れる | 札が出る。札を押すとその条件だけ外れる。「すべて解除」で絞り込みだけが初期値に戻り、系統は残る |
| TC-FILTER-02 | FILTER-02 | ノートがあるタスクと無いタスク | ノートの一部を入れる | ノートにその文字を含むタスクだけが残る |
| TC-FILTER-03 | FILTER-03 | 割り当てなし、メンバー不明、名前を表示できる担当が混在。複数担当のタスクがある | 「割り当てなし」を選ぶ | 割り当てなしと、並びがすべて不明 id のタスクだけが残る。解決できたメンバーが1人でもいるタスクは消える |
| TC-FILTER-03b | FILTER-03 | 同上 | 特定のメンバーを選ぶ | その id が並びに含まれるタスクが残り、メンバー不明だけのタスクは出ない |
| TC-FILTER-04 | FILTER-04 | 完了と未完了が混在 | 「完了以外」を選ぶ | 完了のタスクが消える |
| TC-FILTER-05 | FILTER-05 | 期限超過と期限内が混在 | 「期限超過」を選ぶ | VIEW-05 のタスクだけが残る |
| TC-FILTER-06 | FILTER-06 | 破綻している組と、していない組 | 「前後: 破綻のみ」を選ぶ | 破綻している線の両端だけが残る |
| TC-FILTER-07 | FILTER-07 | マイルストン付きと無しが混在 | 「なし」を選ぶ | 対応が無いタスクだけが残る |
| TC-FILTER-07b | FILTER-07 | 同上 | 特定のマイルストンを選ぶ | それを指すタスクだけが残る |
| TC-FILTER-07c | FILTER-07 | マイルストンが複数ある JSON | 名前の一部と日付の一部で候補を絞る。検索語が空のとき「すべて」と「なし」が先頭にあることを見る | 大文字小文字を区別する。空のときだけ先頭に「すべて」と「なし」 |
| TC-FILTER-07d | FILTER-07 | タスクを選択している | 文字を入れるだけではチャートが変わらない。一覧からマイルストンを選ぶ | 選んだ条件だけが残る。タスクの選択は外れる。パネルは開いたまま一覧は閉じる |
| TC-FILTER-07e | FILTER-07 | 同上 | 一覧が開いている Escape。もう一度 Escape。一致が無い文字で Enter。変換中の矢印 | 1 回目は一覧だけ閉じる。2 回目でパネル。一致が無い Enter では条件は変わらない。変換中の矢印では強調は動かない |
| TC-FILTER-07f | FILTER-07 | 長い名前のマイルストンがある、または 51 件以上 | 候補の折り返しと 50 件、「さらに絞り込んでください」を見る | 長い名前は折り返す。50 件まで。文言は一覧をスクロールしなくても見える |
| TC-FILTER-07g | FILTER-07 | 同上 | Escape のあと文字を入れる | 閉じた表示を置き換えて検索を始める |
| TC-FILTER-07h | FILTER-07 | マイルストンで絞り、タスクを選択している | 同じマイルストンをもう一度選ぶ。別のマイルストンを選ぶ | 同じ行ではタスクの選択が残る。別の行では条件が変わり、タスクの選択は外れる |
| TC-FILTER-07i | FILTER-07 | マイルストンがある JSON | 一致が無い文字を入れる。51 件以上で上限の文言を見る | 一致が無いときは文言だけで、枠付きの一覧は無い。上限の文言は一覧をスクロールしなくても見える |
| TC-FILTER-08 | FILTER-08 | 枝分かれした前後関係 | 枝の途中を選んで「系統」を押す | その起点の先行と後続だけが残る。起点を通らない枝は出ない。もう一度で解除する |
| TC-FILTER-08b | FILTER-08 | 系統を表示している | 別のタスクを右クリックし、「系統を表示」を選ぶ | 起点がそのタスクに切り替わる。同じタスクなら「系統を解除」で外れる |
| TC-FILTER-09 | FILTER-09 | あるグループのタスクがすべて完了 | 「完了以外」を選ぶ | そのグループの行も消える。追加ダイアログでは、そのグループをまだ選べる |
| TC-FILTER-10 | FILTER-10 | サンプル | 「確度」で「未確定」、次に「確定」を選ぶ | 未確定だけ、次に確定だけが残る。選んでいたタスクの選択は外れる |
| TC-FILTER-12 | FILTER-12 | サンプルにタグ付きタスクがある | 「タグ」で二つオンにする。担当など別の条件も入れる | どちらかのタグを持つタスクだけが残る。タグの無いタスクは残らない。ほかの条件も満たすものだけが残る |
| TC-FILTER-12b | FILTER-12 | タグを二つ以上オンにしている | 札を一つ押す。「すべて解除」でも試す | 押したタグだけ外れ、ほかのタグは残る。「すべて解除」で絞り込みは戻り、系統は残る |
| TC-FILTER-12c | FILTER-12 | タグをオンにしている | ファイルを開き直す | タグの選択は無くなる |
| TC-FILTER-12d | FILTER-12 | サンプルでファイル内のタグをすべてオンにできる | すべてオンにする | タグ付きタスクだけが残り、タグの無いタスクは残らない |
| TC-FILTER-12e | FILTER-12 | タグが 9 件以上ある JSON を開ける | 「絞り込み」でタグ欄にフォーカスし、文字を入れて空に戻し、ウィンドウを低くする | パネルの高さと帯の線の位置はタグ件数で変わらない。欄の下に全タグが出る。6 行を超える分は候補一覧だけがスクロールする。前後の空白を除き大文字小文字を区別して候補が減る。空に戻すと全部出る。低くしても一覧は欄の下に出る |
| TC-FILTER-12f | FILTER-12 | タグが無い JSON を開ける | 「絞り込み」でタグ欄を見る | 入力欄は出ず、「タグはありません」と出る |
| TC-FILTER-12i | FILTER-12 | タグが複数ある JSON | 候補を二つオンにする。パネルを閉じる。選択中の名前に一致しない文字を入れ、空に戻す。一致が無い文字で Enter を押す。開き直す | オンにしても一覧は閉じない。パネル内に札は無い。閉じると札がタグごとに出る。一致しない文字ではそのタグは一覧から消え、絞り込みは残る。空にするとチェックがオンで戻る。一致が無いときは「該当するタグはありません」と出て Enter ではタグが増えない。開き直すと入力は空で一覧は閉じ、選択は残る |
| TC-FILTER-12j | FILTER-12 | タグがある JSON | 矢印で現在行を動かし Enter でオンオフする。Space を押す。Escape で一覧を閉じ、欄を押す。一覧が閉じている Enter を押す。変換中に矢印を押す。Escape をもう一度押す。Tab で隣へ移る。パネルを開いた直後のフォーカスを見る | 一覧は開いたまま残る。Space は文字として入る。Escape は 1 回目で一覧、欄を押すと一覧が開く。一覧が閉じている Enter では選択が変わらない。変換中の矢印では現在行が動かない。2 回目の Escape でパネル。Tab は候補を飛ばして隣へ移り一覧が閉じる。開いた直後はタグ欄にフォーカスしない。変換中の Enter ではオンにならない |
| TC-FILTER-12g | FILTER-12 | タグで絞っている | 選んだタグを文書から消す（詳細パネルで外すなど） | 消えたタグだけ選択から外れる。ほかに選んだタグがあれば残る |
| TC-FILTER-12h | FILTER-12 | サンプルにタグ付きとタグ無しのタスクがある | 「タグ」は一つもオンにしない | タグでは絞らない。タグの無いタスクも残る |
| TC-FILTER-12k | FILTER-12 | タグが複数ある JSON | 表示サイズを 100%、75%、50% で試す。各倍率で、タグを一つ目をオンにしたときの入力欄の位置を見る。タグを二つ以上オンにし、担当など別の条件と欄の検索文字も入れる。「選択を外す」を押す。取り消しを試す。一覧が開いているときにマウスで押す。キーボードで押したあとのフォーカスも見る | 一つ目のタグをオンにしても入力欄は動かない。タグの選択だけが空になる。ほかの条件、検索文字、パネルは残る。札が消え、絞り込みボタンの数からタグの分が減る。取り消しではタグの選択は戻らない。マウスでは一覧は開いたままチェックが外れる。キーボードではタグ欄にフォーカスが戻り、一覧が開く |
| TC-FILTER-12l | FILTER-12 | タグがある JSON。タグが無い JSON | タグを一つもオンにしていないときと、タグが無いファイルで「絞り込み」を開く | 「選択を外す」は出ない |
| TC-FILTER-13 | FILTER-13 | `examples/fields.schedule.json` | 「項目名で検索」で項目を選び、文章・数値・パーセント・日付・候補で絞る。「値が無い」の残すと除くを試す。値の条件を空に戻しても、パネルを開いているあいだは条件行が残ることを見る。候補が多いときは候補一覧だけスクロールする。行の「外す」と「選択を外す」。札と「すべて解除」。日付のカレンダーで Escape と日付選択。ライトとダークで文字と枠の見え方を見る。デスクトップ版では「区分」で「内製」を選んだ瞬間も条件行が残ることを見る | 型ごとの条件が効く。候補の値を選んだ瞬間に条件行が残り、その値に合うタスクだけが見える。「値が無い」で残すときは値が無いタスクも残り、除くときは値があるタスクだけが残る。値を空に戻したあともパネルを開いているあいだは行が残る。札の文言が仕様どおり。系統は「すべて解除」で残る |
| TC-FILTER-13b | FILTER-13 | 追加項目の定義が無いサンプル | 「絞り込み」を開く | 「追加項目」は出ない |
| TC-FILTER-13c | FILTER-13 | `examples/fields.schedule.json` | 窓を低くする。「項目名で検索」で追加項目の条件行を複数出す。パネル内をスクロールして一番下の行まで届く。項目名の候補一覧を開く。日付欄のカレンダーを開く | パネルは窓の外へ出ない。下の条件行までスクロールできる。候補一覧は欄の下に重なり、パネルの高さは増えない。カレンダーは選べる |
| TC-VIEW-12 | VIEW-12 | サンプル | 未確定と確定のバーを、ライトとダークで見る。超過もある未確定を見る。サンプルの「本番リリース」も見る | 未確定は斜線で、確定はベタ塗り。色はステータスと期限超過のまま。一覧に「未確定」は出ない。超過があるときは「超過」だけ出る。本番リリースのひし形は斜線で、他のマイルストンは塗りつぶし |
| TC-EDIT-01 | EDIT-01 | サンプル | バーをクリックし、次に左のタスク行をクリックし、背景をクリックする | バーと左の行で選択され端のハンドルが出る。背景で外れる |
| TC-EDIT-01c | EDIT-01, NAV-01 | 見えているタスクが複数ある。行が画面より多い | ↑↓で選択を移す。見えている行を選んだあと、左の行をクリックして選び直す。端で止まる | カテゴリ行とグループ行は飛ばす。見えている行では縦位置は変わらない。画面外の行へ移したときだけ、入るところまでスクロールする |
| TC-EDIT-01d | EDIT-01, NAV-01 | 横にスクロールした状態で、バーが画面にかかっているタスクがある | そのバーをクリックする。次に、横に見えていないタスクを選ぶ | かかっているバーを選んでも横位置は変わらない。見えていないバーを選ぶと、開始の手前が見える位置へ寄る |
| TC-EDIT-01b | EDIT-01 | タスクを選択している | 絞り込みを変える | 選択が外れる |
| TC-EDIT-01e | EDIT-01, EDIT-04 | 見えているタスクが複数ある | ⌘ または Ctrl+クリックで2件選ぶ。一括パネルで担当の並びを変えて適用する。取り消す | 2件とも担当が置き換わる。取り消し1回で戻る |
| TC-EDIT-01f | EDIT-01, EDIT-02 | 2件以上選んでいる | 選択中の1本を横にドラッグする | 選択中の全部が同じ日数だけ動く。ドラッグ中は選んだバーすべてに日付が出る |
| TC-EDIT-01g | EDIT-01, EDIT-11 | 2件以上選んでいる | タスクを右クリックする | メニューは削除だけ |
| TC-EDIT-02 | EDIT-02 | タスクを選択できる | バー本体を横へドラッグして離す。⌘ または Ctrl 付きでも同じ。詳細パネルが開いているときも同じ | 8px を超えたら開始と終了が同じ日数だけ動く。他のバーや日付は動かない。空きやスペースキー付きドラッグはスクロールのまま |
| TC-EDIT-02b | EDIT-02 | タスクを選択できる | バー本体を横へドラッグし、離す前に日付を見る。離したあと、空きをドラッグする。左の名前と、ひし形のドラッグもする | ドラッグ中は開始日と終了日が月/日で、棒と重ならずに出る。離すと消える。スクロール、左の名前、ひし形では出ない |
| TC-EDIT-02d | EDIT-02 | タスクを選択できる | バー本体を動かし、離す前に Escape を押す | 押したときの日付に戻り、履歴には積まれない |
| TC-EDIT-02c | EDIT-02 | 前後の線が複数ある | 1本の端のタスクだけをドラッグし、終了日を非稼働日まで動かす | 触っていない線の色は変わらない。見えている行も変わらない。「休」は出ず、バーの長さは暦日のまま |
| TC-EDIT-03 | EDIT-03 | タスクを選択している | 右端を左へ、1日より短くなるところまでドラッグする | 1日で止まり、終了日が開始日より前にならない。止まった位置の開始日と終了日が出る |
| TC-EDIT-03b | EDIT-03 | タスクを選択している | 左端をドラッグする | 開始日と終了日が出る。1日より短い位置では、その日付で止まる |
| TC-EDIT-03c | EDIT-01, EDIT-03, EDIT-04 | ブラウザ版でタスクを選んでいない | 未選択バーの端をクリックしてから、中央をクリックする。選択後に見えるハンドルと、そのすぐ内側をクリック、ダブルクリックする。端をドラッグして離す。別途、ドラッグ中に Escape を押す | 端の操作では選択が変わらず、詳細パネルの名前欄へフォーカスが移らない。中央のクリックでは選択され、詳細パネルが開く。端のドラッグでは期間だけが変わる。Escape では形が戻り、履歴には積まれない |
| TC-EDIT-04 | EDIT-04 | サンプル | タスクを選び、詳細パネルで名前を空にしてフォーカスを外す | 反映されず、理由が出る |
| TC-EDIT-04c | EDIT-04 | タスクを選択している | Enter を押す | 詳細パネルの名前欄にフォーカスが移る。検索欄にフォーカスがあるときは移らない |
| TC-EDIT-04d | EDIT-04, EDIT-10 | タスクを選択している | 詳細パネルで確度を変え、取り消す | 確度だけが変わり、日付は動かない。取り消し 1 回で戻る |
| TC-EDIT-04e | EDIT-04, EDIT-10, FILTER-12 | タスクを選択している | 詳細パネルでタグを足し、外し、取り消しとやり直しをする | 未保存になる。取り消しとやり直しでタグが戻る。タグの絞り込みの選択は戻らない |
| TC-EDIT-04f | EDIT-04, EDIT-10 | 対応マイルストンが未設定のタスク | 詳細パネルで「対応マイルストン」にフォーカスする。文字が全選択され、先頭が「なし」であることを見る。Enter を押す。別途、名前で絞って別のマイルストンを選び、同じマイルストンをもう一度選び、「なし」を選び、取り消す | 一覧が開き、全選択される。最初の Enter では未設定のまま、取り消しは増えない。選んだときだけ反映し、同じ選び直しでは取り消しは増えない。取り消し 1 回で戻る。「なし」で対応が外れる |
| TC-EDIT-04g | EDIT-04, EDIT-14 | マイルストンが51件以上ある、または一致が無い文字を入れる | 詳細パネルと複製ダイアログで候補を開く。51件目以降を設定済みのとき Enter を押す。一致が無いとき Enter を押す。複製では「追加」も押さない。選ばずにフォーカスを外し、一覧を Escape で閉じる。Escape のあと文字を入れて検索を始める | 50件まで出る。「さらに絞り込んでください」が一覧をスクロールしなくても見える。一致が無いときは枠付きの一覧は出ない。51件目の Enter では外れない。一致が無い Enter では変わらない。複製では追加されない。外すと表示と値が戻る。Escape で一覧だけ閉じ、複製ダイアログは残る。Escape のあとの最初の文字は閉じた表示を置き換えて検索を始める |
| TC-EDIT-04h | EDIT-04 | 一覧に無い ID を指すタスクがある | 詳細パネルで「なし」と出ることを見る。フォーカスで一覧を開き、強調が無いことを見る。Enter を押す。「なし」を選び、取り消す | 選ぶまで ID は残る。検索語が空の Enter では値は変わらない。取り消しは増えない。「なし」で外れ、取り消し 1 回で ID が戻る |
| TC-EDIT-04i | EDIT-04, EDIT-10 | 対応マイルストンが設定済みのタスク。51件未満で一覧の下の方にあるマイルストンを選べる | 詳細パネルで「対応マイルストン」にフォーカスする。強調行が見える位置にあることを見る。先頭が一瞬強調されてから飛び移らないことも見る。矢印で先頭へ戻しても、その行が見える。Enter を押す | その行が強調される。見えない位置なら見えるところへ送られる。Enter では値は変わらず、取り消しは増えない |
| TC-EDIT-04j | EDIT-04, FILTER-11 | 帯の線がオフのグループのマイルストンがある | 詳細パネルで「対応マイルストン」を開き、名前と日付で絞る。文字を入れてもマイルストン件数が増えないことを見る | 帯の線がオフのマイルストンも候補に出る。入力ではマイルストンを足さない |
| TC-EDIT-04k | EDIT-04, EDIT-14 | 複製ダイアログ | 対応マイルストンを変えてキャンセルする。再度開き、変えて「追加」する。一覧を閉じたあと Escape を押す。変換中の Enter を試す | キャンセルでは文書は変わらない。「追加」で選んだ対応が付く。一覧を閉じたあとの Escape でダイアログが閉じる。変換中の Enter では選ばない |
| TC-EDIT-04l | EDIT-04 | ブラウザ版。起動サンプル | タスクを選び、詳細パネルを見る | 「追加項目」の節は出ない |
| TC-EDIT-04m | EDIT-04, FILE-02 | ブラウザ版。`examples/fields.schedule.json` | 値ありのタスクを選び、詳細の「追加項目」を見る。区分のプルダウンを開く | 定義の順でメモ、点数、消化率、確認日、区分が見える。区分は「値なし」のあと「内製」と「外注」だけである |
| TC-EDIT-04n | EDIT-04, FILE-02 | 同上 | 点数と消化率の入力の幅をメモの欄と比べる | 点数はメモと同じ幅である。消化率も同じ幅で、その横に `%` がある |
| TC-EDIT-04o | EDIT-04, FILE-02 | 同上。確認日がパネルの下の方に見える | 確認日のカレンダーを開く | カレンダーは画面の中に収まる |
| TC-EDIT-04p | EDIT-04, FILE-02 | 同上 | 点数だけ変えて保存する。値の無いタスクを開いて保存する | 保存後も `schemaVersion` は 8 である。点数のキーだけが変わる。値の無いタスクは保存できる |
| TC-EDIT-04q | EDIT-04, FILE-02 | 同上。値ありのタスク | 文章のメモを空にしてフォーカスを外す。点数に文字を入れてフォーカスを外す | 空の文章では `memo` のキーが消える。数値でない入力は反映されず理由が出る |
| TC-EDIT-04r | EDIT-04, FILE-02 | 同上 | 配色をライトとダークで切り替え、追加項目の文字を見る | 文字と `%` のコントラスト比が足りる |
| TC-EDIT-08d | EDIT-08, FILTER-12 | タグで絞っている | タスクを追加する | タグの選択は無くなる |
| TC-EDIT-14d | EDIT-14, FILTER-12 | タグ付きタスクをタグで絞っている | そのタスクを複製する | タグの絞り込みは残り、複製が見える |
| TC-EDIT-05 | EDIT-05 | 3件以上のタスク | 編集で、自分を先行にしようとする。次に、循環する先行を保存する | 自分は候補に出ない。循環は保存されず、理由が出る |
| TC-EDIT-05d | EDIT-05 | 詳細パネルでタスクを選んでいる | 先行の候補を開き、Escape を押す | 候補だけが閉じ、パネルは開いたままである |
| TC-EDIT-05b | EDIT-05 | タスクが50件を超えるスケジュール | 先行の検索を空のまま開く | 「さらに絞り込んでください」と出る |
| TC-EDIT-05c | EDIT-05 | カテゴリ名とグループ名が長い後続がある | そのタスクの編集を開く。後続にカーソルを乗せる。先行も見る | タスク名は省略されず見える。階層の行は長いとき省略される。ホバーで「カテゴリ / グループ / タスク名」の全文が出る。先行も同じである |
| TC-EDIT-06 | EDIT-06 | ノートが無いタスク | ノートアイコンから文字を保存し、次に空白だけを保存する | 一度目でノートが付き、二度目でノートが消える |
| TC-EDIT-06b | EDIT-06, EDIT-11 | タスクを選択している | ⌘/Ctrl+N を押す。N だけ、選択が無いとき、線を引くモード、検索欄でも押す。右クリックの「ノート」を見る | 選択中のノートが開く。タイトルはタスク名。ノートが無ければ「ノートはありません」と出る。N だけ、選択が無いとき、線を引くモード、検索欄では開かない。右クリックの「ノート」の右に ⌘N または Ctrl+N が出る |
| TC-EDIT-07 | EDIT-07 | マイルストンがある | ひし形を横にドラッグして離す。次に名前を横にドラッグして離し、名前をダブルクリックで空白にして保存する。名前の右と、段の上下の空きも押す | 日付は、名前を離した位置になる。ドラッグ中の月/日は出ない。空白の名前は元の名前のまま残る。名前の右と段の上下では編集もドラッグも始まらない |
| TC-EDIT-07b | EDIT-07, VIEW-12 | マイルストンが 0 件でもよい | 「マイルストン追加」で名前と日付を、確度は未確定のまま保存する。次に確度を確定にして足す | 未確定は斜線、確定は塗りつぶしのひし形が出る。取り消し 1 回で、最後に足したものだけ消える |
| TC-EDIT-07c | EDIT-07 | 「マイルストン追加」を開いている | 名前を空白だけ、または日付を空にして保存する。次にキャンセルと Escape を試す | どれでもマイルストンは増えない |
| TC-EDIT-07d | EDIT-07 | 同じ名前と日付のマイルストンがある | 「マイルストン追加」で同じ名前と日付を保存する | もう 1 件足される |
| TC-EDIT-07e | EDIT-07 | タスクが指しているマイルストンがある | ひし形を右クリックして「削除」を確認する | マイルストンが消え、指していたタスクの対応だけが外れる。日付は変わらない。取り消し 1 回でマイルストンと対応が戻る |
| TC-EDIT-07f | EDIT-07 | マイルストンがある | ツールバーの「削除」を見る。Delete を押す | マイルストンは消えない |
| TC-EDIT-07g | EDIT-07 | タスクを選択し、系統を出し、そのマイルストンで絞っている | そのマイルストンを削除する | 絞り込みは「すべて」に戻る。選択と系統は残る。取り消しても絞り込みは「すべて」のまま |
| TC-EDIT-07h | EDIT-07, FILE-07, FILTER-11 | マイルストングループが2件以上ある JSON。空のグループを1つ残す | 編集で別のグループへ移し、取り消しで戻す。帯の線がオフのグループを編集で選び、取り消す。空のグループを選ぶ。元のグループが空になるまで移す。ひし形をドラッグする。帯の空き、日付ヘッダー、チャートの空き、ツールバーから「マイルストン追加」を開く。オフのグループを選んで追加する | 編集でグループが変わり、取り消し 1 回で戻る。編集でオフのグループを選ぶとその線がオンになり、ひし形が見える。取り消しのあと、オンにした線はオンのまま残る。空のグループを選ぶと帯が出る。元が空になるとその行は消える。ドラッグでは日付だけが変わり、グループは変わらない。帯の空きの初期グループは指した縦位置。日付ヘッダー、チャートの空き、ツールバーは並びの先頭。追加でオフのグループを選んでも線はオンにならない。差分に `groupId` の前後が出る |
| TC-EDIT-08 | EDIT-08 | タスクを選択し、「完了」で絞っている | 「追加」で、選択中のグループに今日から1日のタスクを足す | そのグループの末尾に、割り当てなし・未着手・未確定で足される。絞り込みは「すべて」に戻り、新しい行が選択される |
| TC-EDIT-08c | EDIT-08, FILTER-10 | 確度を「確定」で絞っている | タスクを追加する。次に、確度を「未確定」に戻してから追加する | 「確定」のときだけ「すべて」に戻る。「未確定」のまま追加したタスクは残って見える |
| TC-EDIT-08b | EDIT-08 | 追加ダイアログ | 終了日を開始日より前にして保存する | 追加されない |
| TC-EDIT-14 | EDIT-14, EDIT-10 | 担当、確度、ノート、タグ、先行があり、進行中のタスク。元を先行にしているタスクがある | 右クリックの「複製」を開き、ステータスが未着手、進捗が 0、先行と後続が空であることを見る。名前だけ変えて追加する。取り消す。別途、追加前に先行または後続を足して追加する | 元の直後に、担当・確度・ノート・タグ・日付・対応マイルストンを写し、ステータスは未着手、進捗は 0、先行は空のタスクが追加される。元を先行にしているタスクは元の ID のまま。後続の相手は、ダイアログで足したときだけ変わる。取り消し 1 回で消える。ダイアログを閉じた直後、手でスクロールしなくても左の行とチャートのバーが見える |
| TC-EDIT-14e | EDIT-14, FILTER-01 | 進行中のタスクがあり、ステータスで「進行中」に絞っている | そのタスクを複製して追加する | 複製は未着手のため、ステータスの絞り込みは「すべて」に戻り、複製が見える |
| TC-EDIT-14b | EDIT-14 | 複製ダイアログ | キャンセル、または Escape を押す。別途、終了日を開始日より前にして追加する | タスクは増えない。日付が不正なときはダイアログが開いたまま |
| TC-EDIT-14c | EDIT-14, FILTER-10 | 確定のタスクがあり、確度を「未確定」で絞っている | そのタスクを複製して追加する。次に確度を「確定」に絞り、確定のタスクを複製する | 未確定で絞っているときは「すべて」に戻り、複製が見える。確定で絞っているときは「確定」のまま、複製が見える |
| TC-EDIT-22 | EDIT-22 | 進行中のタスクを1件選ぶ。親のグループ行に進捗が出ている | 詳細パネルで「TODOを追加」から TODO を2件足し、1件にチェックを付ける。既存 TODO の文を続けて打って確定する。進捗率を手で変えられないことを見る。左の行に `1/2` が名前の直後に出ることを見る。チェックを外して進捗が下がることを見る。チェックの付け外しでステータスの選択値が変わらないことを見る。グループ行の進捗率が下がることを見る。絞り込み欄に TODO の条件が無いことを見る。マイルストンを選び、詳細に TODO 欄が無いことを見る。TODO をすべて削除し、直前の進捗が残ってスライダーが戻ることを見る。複製したタスクに TODO が無いことを見る | 件数と進捗が連動する。行の下にチェックは無い。ステータスは変わらない。ステータス色は変わらない。HTML・SVG に TODO は無い |
| TC-EDIT-22b | EDIT-22, EXPORT-05 | 項目付きタスクがある | Excel 書き出しを開き、TODO 列が初期でオフであることを見る。TODO 列をオンにして書き出す | 初期は開始・終了・ノートだけがオンで、TODO 列はオフである。タスク行の TODO セルに `[x]` と `[ ]` の平文と改行がある。ノート列に混ざらない。チェックボックスではない |
| TC-EDIT-20f | SET-10, FILTER-13, EXPORT-05, SYNC-01 | 拡張項目を選び、タスクに値を入れている。同じタスクにキーを2つ以上入れ、片方だけファイル側で変えて衝突を起こす準備もする | 絞り込みで型ごとに絞れることを見る。Excel で追加項目の列が初期オフで、オンにした項目だけノートの前に出ることを見る。セルが文字・数値・日付で、チェックやプルダウンではないことを見る。パーセント列は `%` 付きであることを見る。HTML と SVG に追加項目が無いことを見る。同じキーで画面が数値・ファイルが文字列の衝突では自動で決まらず、衝突一覧に追加項目が定義順で出ることを見る。ファイルのみの変更で合成したあと、触っていないキーの値が残ることを見る | 操作マニュアルの追加項目の流れと一致する。ステータス色・進捗・TODO は追加項目の説明と混ぜない。操作マニュアルに、項目の意味・LLM 向け指示・型ごとの図を置いていない |
| TC-EDIT-15 | EDIT-15, EDIT-10 | 同じグループにタスクが3件以上ある | 真ん中のタスク行の左端の握りをドラッグして、別の位置で離す。取り消す | ドラッグ中は半透明のタスク行がポインタに付く。離すと左の一覧とチャートの順が変わる。日付と先行は変わらない。取り消し 1 回で戻る |
| TC-EDIT-15b | EDIT-15, NAV-05 | 名前が幅に収まらないタスクがある | その名前をドラッグする。次に左端の握りをドラッグして順を変える | 名前は動かない。マウスを乗せると全文が出る。握りをドラッグすると並べ替えになる |
| TC-EDIT-15c | EDIT-15, FILTER-01 | 同じグループにタスクが複数ある | タスク名で1件だけ残す絞り込みをかけ、行の左端の握りをドラッグする | 並べ替えは始まらない |
| TC-EDIT-15d | EDIT-15, FILE-07 | パスのあるファイルを開いている | 同じグループで順だけ変え、「差分を表示」を開く | `並び タスク` の行が出る。末尾に足しただけの追加では並びは出ない |
| TC-EDIT-15e | EDIT-01, EDIT-11, EDIT-15 | 未選択のタスクと、別の選択中タスクがある | 未選択タスクの左端の握りをクリック、右クリックする。次に同じ握りを 3px 以内で動かして離す | 選択は変わらず、未選択タスクの詳細パネルやメニューは開かない。並べ替えも始まらない |
| TC-KEY-194 | EDIT-07, EDIT-08, EDIT-14, EDIT-15, NAV-07 | サンプル。ライトとダークの両方で「追加」ボタンのキー表示も見る | ⌘ または Ctrl+Enter と Insert でタスク追加が開き、名前欄にフォーカスがある。⌘ または Ctrl+Shift+Enter でマイルストン追加が開く。Alt+↑↓ で同じグループ内を一つ動く。Alt+Shift+↓ で複製が開く。検索欄では効かず、削除ボタンにフォーカスがあっても効き、そのボタンは押されない。線を引くモードでは開かず動かない。タスク追加ダイアログの名前欄で ⌘ または Ctrl+Enter では保存しない。ショートカット一覧とコマンドパレットに項目が出る | 仕様どおり開き、端と絞り込み中は並べ替えしない。複製ダイアログの Enter では確定しない |
| TC-EDIT-16 | EDIT-16, EDIT-10 | カテゴリが3件以上ある。配下のグループとタスクが展開して見えている | 真ん中のカテゴリ行の左端の握りをドラッグして、別の位置で離す。取り消す | ドラッグ中は、見えている配下の行も含めた半透明の塊がポインタに付く。左の一覧の仮の位置は塊の行が空く。離すと左の一覧とチャートで、そのカテゴリのグループとタスクがまとめて移る。中身の日付と先行は変わらない。取り消し 1 回で戻る |
| TC-EDIT-16e | EDIT-16 | カテゴリを折りたたんでいる | そのカテゴリ行の左端の握りをドラッグする | 半透明で付くのはカテゴリ行の1行だけである |
| TC-EDIT-16b | EDIT-16, NAV-05 | 名前が幅に収まらないカテゴリがある | その名前をドラッグする。次に左端の握りをドラッグして順を変える | 名前は動かない。マウスを乗せると全文が出る。握りをドラッグすると並べ替えになる |
| TC-EDIT-16c | EDIT-16, FILTER-01 | カテゴリが複数ある | タスク名で1つのカテゴリだけ残す絞り込みをかけ、カテゴリ行の左端の握りをドラッグする | 並べ替えは始まらない |
| TC-EDIT-16d | EDIT-16, FILE-07 | パスのあるファイルを開いている | カテゴリの順だけ変え、「差分を表示」を開く | `並び カテゴリ` の行が出る |
| TC-EDIT-17 | EDIT-17, EDIT-10 | 同じカテゴリにグループが3件以上ある。配下のタスクが展開して見えている | 真ん中のグループ行の左端の握りをドラッグして、別の位置で離す。取り消す | ドラッグ中は、見えている配下のタスク行も含めた半透明の塊がポインタに付く。左の一覧の仮の位置は塊の行が空く。離すと左の一覧とチャートで、そのグループのタスクがまとめて移る。中身の日付と先行は変わらない。別のカテゴリのグループは動かない。取り消し 1 回で戻る |
| TC-EDIT-17e | EDIT-17 | グループを折りたたんでいる | そのグループ行の左端の握りをドラッグする | 半透明で付くのはグループ行の1行だけである |
| TC-EDIT-17b | EDIT-17, NAV-05 | 名前が幅に収まらないグループがある | その名前をドラッグする。次に左端の握りをドラッグして順を変える | 名前は動かない。マウスを乗せると全文が出る。握りをドラッグすると並べ替えになる |
| TC-EDIT-17c | EDIT-17, FILTER-01 | 同じカテゴリにグループが複数ある | タスク名で1つのグループだけ残す絞り込みをかけ、グループ行の左端の握りをドラッグする | 並べ替えは始まらない |
| TC-EDIT-17d | EDIT-17, FILE-07 | パスのあるファイルを開いている | 同じカテゴリでグループの順だけ変え、「差分を表示」を開く | `並び グループ` の行が出る |
| TC-EDIT-18 | EDIT-18, EDIT-10 | カテゴリが2件以上ある | カテゴリ行を右クリックし「下にカテゴリを追加」で名前を保存する。取り消す | 直後にカテゴリと空の「グループ」が足る。取り消し 1 回で戻る |
| TC-EDIT-19 | EDIT-19, EDIT-10 | タスク0件のグループがあり、同じカテゴリに別のグループがある | そのグループ行を右クリックし「削除」を確認する。取り消す | グループが消える。取り消し 1 回で戻る。最後のグループ単体では「削除」は出ない |
| TC-EDIT-09 | EDIT-09 | 先行を持つタスクを選択 | 「削除」を確認する | タスクが消え、他の先行からも外れ、残ったタスク同士はつながらない |
| TC-EDIT-09b | EDIT-09 | タスクを選んでいない | 「削除」を見る | 押せない |
| TC-EDIT-09c | EDIT-09 | タスクを選択している | Delete または Backspace を押す | 削除確認が開く。検索欄にフォーカスがあるときは開かない。キャンセルでは消えない |
| TC-EDIT-11 | EDIT-11 | サンプル | バーの本体を右クリックし、「ノート」を選ぶ。次に左のタスク行を右クリックする。選択後に見えるハンドルと、そのすぐ内側も右クリックする。カテゴリ行とグループ行も右クリックする | ノートが開く。区切りと削除の危険色、Enter・⌘/Ctrl+N・Delete の表示がある。左のタスク行は右クリックで選択され、左クリックでも選べる。チャートの空白では「マイルストンを追加」だけが出る。ハンドルと端の内側ではメニューが出ず、選択も変わらない。カテゴリ行では追加項目と、消せるときだけ「削除」が出る。グループ行も同様である |
| TC-EDIT-11f | EDIT-11 | ウィンドウを縦に狭める | タスクを右クリックしてメニューを開く | メニューが上下に往復せず、画面内に収まった位置で止まる |
| TC-EDIT-02e | EDIT-02, EDIT-04 | タスクを選び詳細パネルを開く | バー本体を横へドラッグして離す | 詳細パネルと左の開始・終了が、同じ日数だけ動く |
| TC-EDIT-02f | EDIT-02, EDIT-11 | タスクを右クリックしてメニューを開いた直後 | バー本体を横へドラッグして離す | 日付が確定し、取り消し 1 回で戻る |
| TC-EDIT-11e | EDIT-11, EDIT-07 | タスクを選択している。マイルストンが 0 件でもよい | 日付ヘッダー、マイルストン帯の空き、チャートの空き（親バーの上を含む）を右クリックし、「マイルストンを追加」を選ぶ。月表示のヘッダーでも日の位置で確かめる。印の上と、線を引くモードと、ツールバーの「マイルストン追加」も見る | 「マイルストンを追加」だけが出る。名前は空、確度は未確定、日付は指した暦日。選択は変わらない。印の上はマイルストンのメニューのまま。線を引くモードでは出ない。ツールバーから開いた日付は今日。0 件でもヘッダーとチャートの空きから足せる。保存、空白だけの名前、空の日付、キャンセル、取り消しはツールバーと同じ |
| TC-EDIT-11c | EDIT-11, EDIT-10, VIEW-12 | 未確定のタスクと、確定のタスクがある | それぞれを右クリックし、確度の項目を選ぶ。取り消す | 未確定には「確定にする」、確定には「未確定にする」だけが出る。日付は動かない。取り消し 1 回で戻る |
| TC-EDIT-11d | EDIT-11, EDIT-07, EDIT-10, VIEW-12 | 未確定のマイルストンと、確定のマイルストンがある | それぞれを、ひし形かその右の名前で右クリックし、確度の項目を選ぶ。取り消す | 未確定には「確定にする」、確定には「未確定にする」が出る。日付は動かない。ひし形の斜線が切り替わる。取り消し 1 回で戻る。タスクの選択は変わらない |
| TC-EDIT-11b | EDIT-11 | マイルストンがある | ひし形の右の名前を右クリックし、「編集」を選ぶ。線を引くモードでは名前を右クリックする | 「編集」、確度の切り替え、「削除」が出る。選択は変わらない。編集を選ぶと名前、日付、確度の編集が開く。線を引くモードではメニューは出ない |
| TC-EDIT-13 | EDIT-13, EDIT-10 | サンプルで、カテゴリを折りたたむ | 左のカテゴリ行をダブルクリックし、名前を変えて保存する。同じ名前のカテゴリへも変えてみる。空白だけでも保存する。取り消す | 折りたたみは残る。重複する名前は保存されない。空白だけなら元の名前のまま閉じる。取り消し 1 回で名前が戻る。グループ行も同じである |
| TC-EDIT-13b | EDIT-13 | 別のカテゴリに同じグループ名がある | そのグループを、別カテゴリと同じ名前に変える | 保存できる。同じカテゴリの中の既存名には変えられない |
| TC-EDIT-20 | EDIT-20, EDIT-10, FILE-04, FILE-07, NAV-07, SYNC-01 | サンプル。ファイルを開いているときは別名保存したあともよい | 鉛筆で編集を始める。見出しのクリック、ドラッグ、ダブルクリックでは始まらない。全文選択と先頭スクロールを見る。Enter、外クリック、Tab、Shift+Tab で確定し、Escape では戻る。変換中の Enter と Escape では閉じない。前後の空白だけ除き途中の空白は残す。空白だけは元のまま閉じ、「タイトルは変更していません」と一度読む。同じ文字なら履歴も読み上げも無い。変わった確定は取り消し 1 回で戻る。入力中の取り消しは文字入力に効く。確定前は差分と未保存に入らない。入力中に外部ファイルのタイトルは入力へ書き込まれない。FILE-07 で title の行を開いているあいだ、下線は休止中の見出しだけにつく。☰、⌘/Ctrl+O、⌘/Ctrl+S、⌘/Ctrl+Shift+S、書き出し、差分を表示、差分をコピー、JSON を表示の前に確定する。macOS のデスクトップ版では、画面上部のファイルメニューから開く、保存、別名保存、書き出し、JSON を表示も同じ。⌘/Ctrl+K でパレットを開くと確定し、「タイトルを変更」で確定後の文字で開き直す。パレットで開いたあと確定しても、入力は再び開かない。ファイル操作の途中は鉛筆もコマンドも押せない。ファイル名、ウィンドウタイトル、状態バーはタイトルと連動しない。デスクトップ版では入力中に外部更新を止め、確定か Escape のあと続く | 計画どおりに動く |
| TC-EDIT-12 | EDIT-12 | 見えているタスクを選択 | 「線を引く」または ⌘/Ctrl+L を押す。L だけも押す。帯のあいだ、左のタスク名とバーが同じ行に揃うこと、見出しの下端が揃うこと、縦スクロールと表示サイズを変えても揃うことを見る | モードに入る。ボタンに起点の名前が出る。チャート上端の帯は「次にクリックしたタスクを後続にします。Esc で中止」になる。選択が無いときと、L だけでは入らない。モードを終えると左の空きも消える |
| TC-UI-01 | NAV-02 | サンプル | ? と F1 を押す。☰ の「ショートカット一覧」も開く | 一覧ダイアログが開き、Escape で閉じる。検索欄にフォーカスがあるときは ? でも F1 でも開かない |
| TC-UI-02 | NAV-08 | サンプル | 起動直後は案内が出ないことを見る。上段の「案内」、☰ の「操作の案内」、⌘ または Ctrl+K で「操作の案内」を開く | 見出し「スケジュールの作り方」「画面」「タグ」「気づきにくい操作」「色と線」が出る。スキルの2文はブラウザ版でも出る。本文にフォーカスしたままキーで末尾までスクロールできる。Escape で閉じる。中の「ショートカット一覧」で案内が閉じ、ショートカット一覧が開く。? と F1 は一覧を開く |
| TC-UI-02b | NAV-08 | ブラウザ版 | 案内を開く | 「気づきにくい操作」に、外部ファイルの反映と自動更新の文が無い |
| TC-UI-02c | NAV-08 | デスクトップ版 | 案内を開く | 外部ファイルの反映と自動更新の文が出る |
| TC-EDIT-12b | EDIT-12 | 線を引くモード | カーソルを動かし、タスクバー、左の一覧、それ以外へ乗せる | 起点の右端から折れ線が追随する。バーの上ではその左端まで、一覧の上ではチャートの左端まで伸びる。乗ったタスクバーだけ別の輪郭になる。起点、親バー、ひし形は強調されない。モードを終えると線は消える |
| TC-EDIT-12c | EDIT-12 | 線を引くモード | 別のタスクバーをクリックする。続けて Esc、起点の再クリック、「線を引く」、⌘/Ctrl+L を試す。親バー、ひし形、背景もクリックする | クリックで線が 1 本加わる。取り消しの 1 ステップで戻り、モードは残る。Esc、起点、ボタン、⌘/Ctrl+L では結ばずに終わる。親バー、ひし形、背景では終わらない |
| TC-EDIT-12d | EDIT-12 | 線を引くモード | 空きを 3px 未満で離す。同じバーを 8px 未満で離す。バーで 8px 以上動かして離す。押して 8px 未満のまま空きか別のバーで離す。親バー、スペース、中ボタンでドラッグする。バーの端の外 12px 付近も試す。同じバーをすばやく 2 回押す。スクロール中にチャートの外へ出す。ドラッグ中に Esc。ホイールの縦と横、Shift+ホイール、⌘ または Ctrl と矢印も試す | 空きを 3px 未満で離すと線もビューも変わらない。3px ほど動かすとその時点でスクロールし、閉じた手が出る。8px 未満で同じバーを離すと後続になる。スペースのまま 3px 未満で同じバーを離すと後続になる。8px 以上のドラッグはスクロールし、離した場所がバーでも線は増えない。閉じた手はスクロール中だけで、離すと矢印に戻る。その直後の短いクリックで線が 1 本増える。8px 未満のまま空きか別のバーで離すと線もスクロールも起きない。親バー、スペース、中ボタンは 3px でスクロールする。中ボタンでは線が増えない。端の外でも 3px でスクロールする。すばやい 2 回押しでは線は 1 本で、名前欄へ移らない。スクロール中に外へ出ても追随する線が残る。Esc でモードと追随する線が消え、閉じた手も消える。ビューは Esc の時点の位置のまま。移動、期間変更、ひし形の日付変更はしない。ホイールと矢印ではスクロールし、追随する線も動く。モードは残る。ダブルクリックと Enter では詳細パネルの名前欄にフォーカスが移らない |
| TC-EDIT-12e | EDIT-12 | すでに結ばれている組と、循環する組 | そのタスクをクリックする | 保存されない。詳細パネルと同じ理由が出る。モードは残る |
| TC-EDIT-12f | EDIT-12 | 折りたたみか絞り込みで見えていないタスクがある | 線を引くモードでスクロールしてから、見えていないタスクをクリックする。見えているタスクだけをクリックする操作も試す | スクロールして見えた相手へは引ける。画面の外を指して結ぶ操作はない。詳細パネルの先行と後続は今どおり足せる |
| TC-EDIT-12g | EDIT-12 | 見えている線がある | 線にカーソルを合わせて Delete または Backspace を押す。別の線を右クリックして「線を外す」を選ぶ。バーの上でも Delete を押す | 線は 1 本だけ消え、確認は出ない。取り消しの 1 ステップで戻る。タスクは残る。バーやひし形の上ではタスクの削除確認が開く。ツールバーの「削除」はタスクを消す |
| TC-EDIT-10 | EDIT-10 | バーを動かした直後 | ⌘/Ctrl+Z を押し、続けてやり直す | 移動が戻り、やり直しで再度動く。検索欄にフォーカスがあるときは動かない |
| TC-EDIT-10b | EDIT-10 | 取り消しできる編集がある | 別のファイルを開く | 取り消しできなくなる |
| TC-EXPORT-01 | EXPORT-01 | サンプル | 「書き出し」で SVG を選んで保存する | SVG ファイルができる。キャンセルではできない |
| TC-EXPORT-02 | EXPORT-02 | タスク名で数件に絞る | HTML で書き出す | 絞り込みで残った行だけが入り、絞り込みで隠したタスクは入らない。画面の外にスクロールしている行も入る |
| TC-EXPORT-03 | EXPORT-03 | 書き出しの行が 10,000 を超えるデータ | 「書き出し」を実行する | ファイルを作らず、行数の上限を理由に出す |
| TC-EXPORT-04 | EXPORT-04 | タイトルに `/` や `:` がある | 書き出しの保存ダイアログを開く | 提案名からそれらの文字が除かれ、選んだ形式の拡張子が付く |
| TC-EXPORT-05 | EXPORT-05 | デスクトップ版でサンプルを開く。二人以上の担当を付けたタスクがある。設定をダークにしてもよい | Excel を選び、左の列を変えて保存する。担当列をオンにし、複数担当のタスク行と見出し行、マイルストン行を見る | `.xlsx` ができ、選んだ左の列と日付の列に見えている行が入る。担当列は1列のままである。タスク行の担当セルは、棒の右と同じ文字列で、入れた順を「、」でつないですべて入り、8文字では切らない。同名の表示名だけ id が付く。空は「未割当」、一覧に無い id はその位置が「メンバー不明（id）」である。見出し行とマイルストン行の担当列は空である。担当を増やしても行数と日付の図形の数は増えない。ノート列は折り返される。名前の字下げでカテゴリ・グループ・タスクが分かれ、左の列に薄い罫線があり、日付の列は縦罫線だけが付き、マイルストン行には罫線が無い。日表示では休日の列が見出しからタスクまで続き、その灰色はライトのグループ行と同じ濃さである。タスク名は黒である。グループ名と遅延のタスク名は、画面がダークでもライト配色の文字色で読める。カテゴリの塗りは左の列だけである。マイルストンは「◆ 名前」で、同日は「、」でつながる。親バーは細く、空きは点線で、両端に直角三角形の角がある。既定の格子は出ない。前後は、先行バーの右辺の中央と後続バーの左辺の中央に付いたカギ線矢印で、イナズマ線がオンのときの今日の縦線が入る。キャンセルではできない |
| TC-SET-01 | SET-01 | 設定の「表示」 | 「200%」を選び、アプリを起動し直す。次に「自動」を選び、再起動する | 文字と行が大きくなり、再起動後も維持される。「自動」も localStorage に残り、次の起動でも自動のままである |
| TC-SET-01b | SET-01 | 表示サイズが自動、または 100% | ⌘ または Ctrl と +、=、− を押す。押し続ける。200% と 50% でも押す。検索欄、開いている設定、右クリックメニュー、線を引くモードでも押す | 一段ずつ変わり、端では止まる。自動は隣の固定段になり、再起動後も残る。設定の選択が追従する。右クリックメニューは閉じ、線を引くモードは残る。ページはズームしない |
| TC-SET-01c | SET-01 | 左一覧の列をすべて出す | 開始が 9 月 19 日、終了が 9 月 21 日、進捗が 30% のタスクと、超過のある行と無い行を見る | `09/19`、`09/21`、日数、`30%`、ステータス、超過、担当が、行をまたいで同じ位置に揃う。超過が無い行もその幅は空く。名前にマウスを乗せても列は動かない |
| TC-VIEW-13 | VIEW-13 | 一覧に無い `status`、メンバーに無い `assigneeId`、または定義に無い `fieldValues` キーがあるファイル。ステータス列はオフ | 帯の文を見る。定義に無い追加項目は詳細で編集できないことを見る。左のタスク名とバーが同じ行に揃うこと、見出しの下端が揃うことを見る。絞り込みで該当行を隠しても帯が残ることを確かめる。右下の一時的な知らせを出しても帯が残ることを確かめる。設定でステータス列をオンにし、一覧に無い `id` の札と、メンバー不明の札を縦に見る。線を引くモード中は帯がその上にあり、両方の帯でも揃うことを見る。縦スクロールと表示サイズを変えても揃うことを見る。ライトとダークで、札の文字と帯の文字・左線のコントラストを見る | 帯は三つの文のいずれかだけ。`id` も件数も出ない。列は見えているタスク行だけ。未割当だけのときは帯は出ない。不一致が無くなると帯は消え、左の空きも消える。トーストが出ても帯は消えない。札の文字は 4.5:1 以上、帯の左線は 3:1 以上である |
| TC-VIEW-14 | VIEW-14 | デスクトップ版。`examples/colors/workspace.json` を開く | ライトとダークを切り替える。注力のタスクの詳細で「色」を開き、注力と待ちの名前の左に黄と青の小さな四角があること、候補の行全体は塗られないことを見る。色を「待ち」に変え、地が青になること。同じタスクを複製し、色を「なし」にして追加すると地が付かないこと。注力と待ちの2件を選び、一括で同じ色に適用して両方の地が変わること。注力の地が黄から暗い茶へ変わること、バーの色は変わらないこと、見出しとマイルストンと色なしの行は今の地のままであること、帯が「一覧に無い色があります。」であること、土日の列は灰色のままであることを見る。ダークのまま Excel に書き出し、注力の行の地が暗い茶ではなくライトの黄系であること、バーがステータス色のままであることを見る。ブラウザ版の起動サンプルでは「色」欄が出ないこと | 一覧に無い `colorId` の行は塗らない。一覧にあるだけの `risk` は塗らない |
| TC-SET-04 | SET-04 | 設定の「表示」 | 「ダーク」を選び、HTML を書き出す | 画面と書き出しが暗い配色になる。再起動後もダークのまま。「システム設定に合わせる」に戻すと保存値は消える |
| TC-SET-02 | SET-02 | 正しいメンバー JSON | 「取り込み…」で入れ、使用中にする | 見出しの近くにカタログ名が出て、一致する ID が名前になる。スケジュール JSON にはメンバーが増えない |
| TC-SET-02b | SET-02 | 同じカタログがすでにある | もう一度取り込む | 上書きしてよいかを聞く |
| TC-SET-08 | SET-08, VIEW-02 | 初回起動のデスクトップ版またはブラウザ版 | 設定の「ステータス」を見る。`examples/playground.statuses.json` を取り込んで使用中にする | 「standard」が使用中で、三件の色は従来と同じである。取り込み後は、詳細パネルと絞り込みの選択肢が一覧の順に変わり、バーの色が項目の色になる |
| TC-SET-08b | SET-08, VIEW-05 | 扱いが完了の項目が複数ある一覧を使用中にし、終了日が過去のタスクがその項目と他の項目にある | バーを見る。絞り込みで「完了以外」を選ぶ | 期限超過は未着手と着手済みだけで、バーは地の色のまま枠だけ赤い。「完了以外」は扱いが完了の項目をすべて外す。管理外は残る |
| TC-SET-08c | SET-08 | 一覧に無い `status` の `id` を持つタスクがある | チャートと詳細パネルを見る | `id` のまま出て、バーは中立の灰である。終了が過去でも枠は赤くならない。イナズマ線は今日のまま。「完了以外」には残る |
| TC-SET-08d | SET-08 | 一覧を使用中にしている | 設定の「項目を編集…」で覆いを開き、使用中の一覧を選んで「項目を足す」で足し、行を選んで右の説明と指示を書き、色を変えて「保存」する。詳細パネルの選択肢を見て、そのステータスをタスクに付ける | 選択肢の末尾に出て、バーがその色になる。再起動後も説明と指示が残る。保存した項目の `id` は編集できない |
| TC-SET-08o | SET-08 | 覆いで一覧を編集している | 行を選び、右の説明を書き、指示を空にして保存する。扱いを押してもその行が選ばれること、行に説明が1行出ること、扱いの説明がチップの直下で2行であること、扱いを乗せ替えても色と操作の位置が動かないこと、右に上の項目と下の項目の説明が無いことを見る。説明欄に焦点がある ⌘/Ctrl+Z で説明と扱いが戻ること、色を変えて ⌘/Ctrl+Z で1段で戻ること、下書きを捨てる確認が出ているあいだは戻らないことを見る。macOS では編集メニューの取り消しも同じ履歴を使うこと。幅を極端に狭めても扱いの説明が3行にならず末尾が省略されることを見る。ライトとダークで、説明とヒントの文字が 4.5:1 以上、左の帯が 3:1 以上であることを見る。覆いを閉じて開き直す | 説明は残り、指示はキーが無い。選んでいる行は左の帯で分かる。狭い幅で覆いを開き、一覧が2行以上見え、足元の操作が残る |
| TC-SET-08e | SET-08 | 同上 | 説明を空にする。`id` を既存と同じにする。項目が1件になるまで「削除」する | 保存と書き出しができず、理由が出る。最後の1件の「削除」は押せない。外した `id` を持つタスクは `id` のまま灰色で出る |
| TC-SET-08f | SET-08 | 同上 | 「上へ」「下へ」で並びを変え、「JSON を書き出す」で保存し、`npm run check:statuses -- <ファイル>` を通す。「コピーして作る」で一覧を足す | 選択肢の順が変わる。書き出したファイルは検証を通る。使用中の一覧は変わらない |
| TC-SET-08h | SET-08 | 覆いで一覧を編集している | 下書きがあるときに「閉じる」を押し、「やめる」を選ぶ。続けて「捨てる」を選ぶ。「新しい一覧」で一覧を足し、使用中が変わらないことを見る | やめるときは覆いが残る。捨てるときは閉じる。新しい一覧を作っても使用中は変わらない |
| TC-SET-08k | SET-08 | 覆いを開いている | 「新しい一覧」で `custom` が増えることを見る。「JSON を書き出す」の保存ダイアログでキャンセルする | 新しい一覧ではダイアログは出ない。書き出しをキャンセルしても取り込み済みの件数は変わらない |
| TC-SET-08l | SET-08, FILE-10 | 設定ファイルで `statuses` を読めている | 設定の「項目を編集…」で覆いを開き、色を変えて「保存」する | このウィンドウのバーが変わる。アプリの使用中一覧は変わらない |
| TC-SET-08n | SET-08 | 覆いで一覧を2件以上選べる。使用中の一覧と、使用中でない一覧の両方で試す | 「外す」で「やめる」を選ぶ。下書きがある一覧でも同様に試す。続けて「外す」で進める。最後の1件だけ残して外す。使用中の一覧を外す | やめるときは一覧が残り、下書きも残る。外したあとも覆いは開いたまま。残りがあれば先頭の一覧を開く。最後の1件を外すと取り込み済みが無い表示になる。使用中を外すと未選択になり、チャートは組み込みの三件になる |
| TC-SET-08m | SET-08, FILE-10 | 設定ファイルで `statuses` が無い、または読めない | 設定の「ステータス」を見る | 「項目を編集…」は出ない |
| TC-SET-08i | SET-08 | デスクトップ版で同じ一覧を2つのウィンドウが開ける | 一方で覆いを開いて一覧を選ぶ。もう一方で同じ一覧を選ぶ | 編集中のウィンドウが前面になり、もう一方では一覧が選ばれない |
| TC-SET-08j | SET-08 | 覆いで一覧を編集中 | 設定でその一覧を「外す」。続けて別ウィンドウから同じ一覧を取り込み上書きする | 外したときは覆いが閉じ、知らせが出る。上書き取り込みのあとは覆いが開いたまま、内容が入れ替わる |
| TC-SET-08g | SET-08, VIEW-02, VIEW-05, VIEW-07, FILTER-04 | 今日が 2026-10-23 から 2026-11-01 のあいだ | 設定の「ステータス」で `examples/review.statuses.json` を取り込んで使用中にし、`examples/review.schedule.json` を開く。絞り込みで「完了以外」を選ぶ | 確認待ちが黄で、帯が出る。進行中は地が青のまま枠だけ赤く、帯が出る。完了と中止は終了が過去でも超過にならず、中止は帯が無い。一覧に無い `shelved` は `shelved` の表示で灰色になり、超過にならず線は今日のまま。未着手は帯が無い。イナズマ線は扱いどおり折れ、未来開始の着手済みは開始日へ折れる。終了日が今日の行は終了より先へ折れない。「完了以外」で完了と中止が消え、一覧に無い `id` は残る |
| TC-SET-10a | SET-10, EDIT-04, FILE-02 | `examples/fields.schedule.json` だけを開く | 詳細の追加項目を見る | 値は未登録の追加項目として見え、型どおり編集できない |
| TC-SET-10b | SET-10, EDIT-04, FILE-10 | `examples/fields/workspace.json` で開く | 値ありタスクの詳細と絞り込みの追加項目を見る | 定義どおり編集でき、絞り込みに候補が出る |
| TC-SET-10c | SET-10, EDIT-04, FILE-02 | 拡張を取り込み使用中 | 設定の「項目を編集…」で必須・デフォルトを設定して保存。スケジュールを保存せず開き直す | 拡張 JSON に定義が残る。スケジュールの `fieldValues` は変わらない |
| TC-SET-10d | SET-10, EDIT-04, FILE-02 | 同上、必須の項目がある | 値が空のタスクでスケジュールを保存する。詳細のラベルを見る | 保存できず「保存できません」。空のときだけ「空欄」 |
| TC-SET-10e | SET-10, EDIT-04 | デフォルト付きの拡張を使用中 | 新規タスクを足す。既存を複製する | 新規だけデフォルトが入る |
| TC-SET-10f | SET-10, SYNC-01 | 覆いを開いている | 外部で同じ拡張ファイルを更新する。読み直しを選ぶ | 即時反映しない。読み直し前に覆いが閉じ、下書きは確定しない |
| TC-SET-10g | SET-10 | ブラウザ版 | 設定から覆いを開き、幅 900px 未満で見る | 見出しの右に「閉じる」が一つだけある。右欄が下へ移り、足元の「項目を足す」「保存」「編集を戻す」「JSON を書き出す」が画面内に残る |
| TC-SET-10h | SET-10 | 拡張を1件以上取り込み済み | 覆いで「新しい拡張」を押す。別の拡張のラジオを選んでから戻す。もう一度「新しい拡張」を押す | 新しい拡張が選ばれ、項目が1件ある。ラジオにすぐ出る。戻れる。2回目は別 ID のラジオが増える。失敗のときは理由が出る |
| TC-SET-10k | SET-10 | 拡張を1件以上取り込み済み | 覆いで「コピーして作る」を押す。別の拡張のラジオを選んでから戻す | コピーが選ばれる。ラジオにすぐ出る。戻れる。失敗のときは理由が出る |
| TC-SET-10i | SET-10 | 覆いで拡張を編集中 | プラグイン ID を変えて保存する。覆いを閉じる | 新しい ID のファイルに保存される。設定の「拡張項目」が開き、一覧に新 ID が出る |
| TC-SET-10j | SET-10 | 覆いを開いたあと | 「閉じる」または Escape で覆いを閉じる | 設定の「拡張項目」に戻る |
| TC-SET-10l | SET-10, FILE-10 | `examples/fields/workspace.json` で開く。編集用が無い | 設定の「拡張項目」を見る | ピン留めだけ表示され、「項目を編集…」は出ない。「編集用の拡張を作る」が出る |
| TC-SET-10m | SET-10, FILE-10 | 同上 | 「編集用の拡張を作る」を押す | フォルダに `custom.fields.json` ができ、`workspace.json` に `editableFieldExtension` が書かれる。アプリデータの取り込み一覧は増えない。「項目を編集…」と「消す」が出る |
| TC-SET-10n | SET-10, FILE-10 | 編集用がある | 覆いで保存する。ピン留めと同じプラグイン ID に変えて保存する | 編集用のファイルだけ上書きされる。ピン留めと同じ ID は保存できない |
| TC-SET-10o | SET-10, FILE-10 | 編集用がある | 「消す」で「やめる」を選ぶ。続けて「消す」で進める | やめるときはファイルと項目が残る。進めたあとは `editableFieldExtension` とファイルが消え、ピン留めは残る。タスクの値は未登録の追加項目として残る |
| TC-SET-10p | SET-10 | （自動）`taskFields.test.ts` | 型や候補が合わない既知キーがある文書で保存判定を呼ぶ | 拒否され、シリアライズ用の値はファイルから消えない |
| TC-SET-10q | SET-10 | （自動）`scheduleFilterPersistence.test.ts` | 定義が空のとき `pruneFieldFilters: false` で復元を呼ぶ | 記録の項目条件が残る |
| TC-SET-10r | SET-10, FILE-10 | （自動）`validateWorkspace.test.ts` | 編集用パスだけの設定、絶対パス、空白 | 相対だけ通り、絶対と空白は拒否する。ピン留めと同じパスは `workspaceJson.test.ts` |
| TC-SET-10s | SET-10 | （自動）`fieldExtensionEdit.test.ts` | 合成キーが重なる拡張を保存前に判定する | 理由に合成キーが含まれる |
| TC-SET-03 | SET-03 | 平日を非稼働にするカレンダー | 「稼働日」で取り込む | 日表示でその日が薄い灰になる。バーの長さは暦日のまま |
| TC-SET-03b | SET-03 | カレンダー取り込み済み | 「外す」を押す | 土日だけを塗る状態に戻る |
| TC-SET-05 | SET-05 | デスクトップ版、置き先に同名が無い | 設定の「JSON作成スキルを置く」で Cursor、ユーザー全体を選び「置く」 | write-schedule、write-members、write-calendar、write-workspace、write-fields が `~/.cursor/skills/` に置かれ、パスが示される |
| TC-SET-05b | SET-05 | 上記のいずれかが既にある | もう一度「置く」 | 上書き確認が出る。上書き後、置いたパスが示される |
| TC-SET-05c | SET-05 | 指定フォルダへ Claude Code を置く。`~/.claude/skills/` に同名がある | 「置く」 | 置いたあと、個人用が先に使われる旨が出る |
| TC-SET-05d | SET-05 | ブラウザ版 | 設定の「JSON作成スキルを置く」を開く | デスクトップ版でのみ置ける旨が出て、「置く」は押せない |
| TC-SET-05e | SET-05 | デスクトップ版、ユーザー全体に5つがある | 「外す」で確認のあと外す | 5つが消え、外したパスが示される。skills フォルダと別名スキルは残る |
| TC-SET-05f | SET-05 | デスクトップ版、置き先に同名が無い | GitHub Copilot、ユーザー全体を選び「置く」 | 5つが `~/.copilot/skills/` に置かれ、パスが示される。`~/.copilot` が無くても作られる |
| TC-SET-05g | SET-05 | デスクトップ版 | GitHub Copilot、指定したフォルダを選び「置く」 | 5つが `<フォルダ>/.github/skills/` に置かれ、パスが示される。git には入れない |
| TC-SET-05h | SET-05 | デスクトップ版 | Cursor、Claude Code、GitHub Copilot をすべて選び、ユーザー全体で「置く」 | 15パスが示される。中身は同じ5つ |
| TC-SET-05i | SET-05 | デスクトップ版 | 置く先のチェックをすべて外す | 「置く」と「外す」は押せない |
| TC-SET-05j | SET-05 | デスクトップ版、ユーザー全体の Copilot に5つがある | 「外す」で確認のあと外す | 5つが消え、外したパスが示される。skills フォルダと別名スキルは残る |
| TC-MCP-02c | MCP-02 | デスクトップ版 | 「MCP を使えないときに渡す」で GitHub Copilot を選び「置く」 | `read-screen` が `~/.copilot/skills/read-screen/` に置かれ、パスと実行ファイルのパスが示される |
| TC-MCP-02d | MCP-02 | デスクトップ版、Copilot に read-screen がある | 同じ欄で GitHub Copilot を選び「外す」 | その1つだけ消え、外したパスが示される |
| TC-MCP-02e | MCP-02 | デスクトップ版 | 置く先のチェックをすべて外す | 「置く」と「外す」は押せない |
| TC-SET-06 | SET-06 | ブラウザ版 | 設定を開く | 「更新」の欄が無い |
| TC-SET-06b | SET-06 | デスクトップ版、初回起動 | 設定の「更新」を見る | 「起動時に更新を確認する」はオフである |
| TC-SET-06c | SET-06 | デスクトップ版、2つのウィンドウ | 片方で自動更新をオンにする | もう一方もオンになる。オンにした直後は更新を確認しない |
| TC-SET-06d | SET-06 | 自動更新オフ | 起動する | 更新を確認しない |
| TC-SET-06e | SET-06 | Ubuntu、自動更新オン、同じメジャーの `updater-X` により新しい安定版がある | 起動する | 起動復旧のあと、入れ直す前の知らせが出る。「入れ直す」で入れ直す。失敗したときは隅に短く出て、今の版のまま使える。起動時に変更履歴のダイアログは出ない |
| TC-SET-06k | SET-06 | 自動更新オン、リモートが別メジャーだけ、または `updater-X` が無い | 起動する | 入れ直さない。隅の知らせも出ない |
| TC-SET-06f | SET-06 | 自動更新オン、サンプルが未保存 | 新しい版で入れ直す流れでキャンセルする | その起動では入れ直さない |
| TC-SET-06g | SET-06 | 自動更新オン、パスのあるファイルが未保存 | 新しい版で入れ直す | 確認は出ず、再起動後に控えが戻る |
| TC-SET-06h | SET-06 | 自動更新オン、同じパスを2つのウィンドウで開き、前面で未保存 | 新しい版で入れ直す | 確認は出ず、再起動後に前面の控えが戻る |
| TC-SET-06i | SET-06 | デスクトップ版、自動更新オフ | 設定の「更新」を開く。表示サイズ 100% と 200%、ライトとダーク、ウィンドウを低くした状態でも見る | 同梱の版が新しい順に並ぶ。`[Unreleased]` と冒頭の説明は無い。版番号、項目、Issue の札が欠けない。Issue 番号のリンクが開く。欄の中だけがスクロールし、チェックはダイアログの中に見える |
| TC-SET-06j | SET-06 | デスクトップ版 | 起動直後の画面を見る | 変更履歴のダイアログは出ない。入れ直しに失敗したあとの起動でも出ない |
| TC-SET-06l | SET-06 | ブラウザ版 | ☰ を開く | 「更新を確認」が無い |
| TC-SET-06m | SET-06 | デスクトップ版、入れ直す版が無い（確認先の `updater-X` がまだ無いときを含む） | 「更新を確認」する | 「この版が最新です」が出る |
| TC-SET-06m2 | SET-06 | デスクトップ版、入れ直す版がある | 「更新を確認」する | 起動時と同じ知らせと「あとで」「入れ直す」が出る |
| TC-SET-06m3 | SET-06 | デスクトップ版、更新の確認が通信などで失敗する | 「更新を確認」する | 「更新の確認に失敗しました」が出る |
| TC-SET-06m4 | SET-06 | GitHub Releases の Apple Silicon 版、デスクトップ版、その版が最新 | 「更新を確認」する | 「この版が最新です」が出る |
| TC-SET-06u | SET-06 | この変更を含む版の安定版 Release の `schedule-viewer_*_aarch64.dmg` | Release から dmg を落とし、アプリケーションフォルダへ入れ、Release 本文の手順で起動する。スケジュールを開く。`SHA256SUMS` の値と dmg の SHA-256 が一致することを見る。安定版の `latest.json` と `updater-X` の `latest.json` に `darwin-aarch64` があることを見る | 起動できる。スケジュールを開ける。ハッシュが一致する。`darwin-aarch64` がある |
| TC-SET-06v | SET-06 | TC-SET-06u のあと、次の安定版が公開され、自動更新がオン | 起動時の知らせまたは「更新を確認」で「入れ直す」を選ぶ | 再起動後に版が進む。その起動で Gatekeeper の警告は出ない |
| TC-SET-06t | SET-06 | GitHub Releases の Windows 版、確認先の `latest.json` に `windows-x86_64` が無い（安定版の `updater-X` を見ている） | 起動時の自動確認のあと、「更新を確認」する | 起動時は入れ直しの知らせが出ない。手動では「Windows の安定版は Microsoft Store で入手・更新します。」が欄または隅に出る |
| TC-SET-06n | SET-06 | デスクトップ版、知らせが出ている | 設定を開き「更新」以外を見る | 隅の知らせは出ない。「更新」に戻すと同じ知らせが見える |
| TC-SET-06o | SET-06 | Windows または Ubuntu、入っている版 `1.0.0`、公開ベータ `1.0.0-beta.1` だけ | 設定の「更新」で「インストーラを保存」 | 「公開中のベータはありません」 |
| TC-SET-06p | SET-06 | 同上、公開ベータ `1.0.1-beta.1` がある | 同上 | 保存先を選べ、欄にパスが出る。インストーラは起動しない |
| TC-SET-06q | SET-06 | macOS のデスクトップ版 | 設定の「更新」を見る | ベータの保存ボタンと説明が無い |
| TC-SET-06r | SET-06 | Microsoft Store の MSIX 版、Windows | 起動する。☰ と設定の「更新」を見る | 起動時の入れ直し知らせが出ない。「更新を確認」が無い。設定の「更新」に Windows が更新する旨と変更履歴だけがある。「起動時に更新を確認する」とベータ保存が無い |
| TC-SET-06s | SET-06 | 旧 `com.collabcentral.schedule-viewer` にメンバーと控えがある、新 identifier のディレクトリが無い | NSIS 版を一度起動する | 新ディレクトリに内容が移る。旧ディレクトリは残る。2回目の起動で上書きしない |
| TC-SET-07 | SET-07 | デスクトップ版 | 設定を開く。表示、メンバー、更新の各セクションを見る | どのセクションでも下に `バージョン ` と、入れている版の番号が出る。押しても閉じず、変更内容は出ない |
| TC-SET-07b | SET-07 | ブラウザ版 | 設定を開く | 同じ位置に `package.json` の番号が出る。「更新」の欄は無い |
| TC-SET-07c | SET-07 | 表示サイズ 50% と 200%。ライトとダーク | 設定を開く | 行はダイアログの中に収まる。文字色は設定の注記と同じ二次色である。欄が長いときはその欄だけがスクロールし、版の行はダイアログの下に残る |
| TC-MCP-01 | MCP-01 | デスクトップ版（macOS、Ubuntu、Windows）、絞り込み・選択・未保存がある | 設定の「画面の状態を渡す」で JSON をコピーし、Cursor または Claude の mcp.json に貼って `schedule_diff`、`baseline_diffs`、`selected_task`、`selected_tasks`、`filtered_tasks`、`current_schedule` をそれぞれ1回呼ぶ。0件選択、1件選択、2件以上選択のときも `selected_task` と `selected_tasks` を見る | 差分は差分テキストだけ。`baseline_diffs` は `画面:`・`ファイル:`・`分類:` のプレーンテキスト。`selected_task` は1件のときだけそのタスク。0件と2件以上は null。`selected_tasks` は選択をカテゴリ、グループ、タスクの文書順の配列で返す。0件は空配列でエラーではない。1件のときは `selected_task` と同じ1件を含む。2件以上のときは選択の全部を含む。マイルストンは含まない。絞り込みの外でも選択に残っていれば `selected_tasks` に含む。`schedule_diff` と `filtered_tasks` の中身は変わらない。`filtered_tasks` はオン条件と残るタスクだけ。`current_schedule` は画面のスケジュール JSON 全体で、未保存の内容と一致する。画面の絞り込みは変わらない |
| TC-MCP-01i | MCP-01, SET-08 | 項目を足した一覧を使用中にしている。任意の項目に指示を書いて保存している | `filtered_tasks` と `selected_tasks` を呼ぶ。足した項目のステータスを付けたタスクを `replace_schedule` で足すよう LLM に頼む | どちらの応答も先頭に `statuses` があり、足した項目の `id`、`name`、`role`、`description` が入る。指示を書いた項目だけ `instruction` が入り、空の項目には無い。LLM は `description` でその `id` を選び、合う項目が無ければ尋ねる |
| TC-MCP-01e | MCP-01 | デスクトップ版、画面の未保存とファイルの外部更新が同時にある | `baseline_diffs` を1回呼ぶ | `画面:` に起点から画面への差分、`ファイル:` に起点からファイルへの差分、`分類:` に画面のみ・ファイルのみ・異なるなどが id ごとに出る。`schedule_diff` の混ざった差分だけでは分類しない |
| TC-MCP-01b | MCP-01 | デスクトップ版（macOS、Ubuntu、Windows）、アプリを終了した状態 | 登録した MCP でいずれかのツールを呼ぶ | スケジュールのウィンドウが開いていない旨が返る |
| TC-MCP-01c | MCP-01 | 同じファイルを2つのウィンドウで開き、前面だけ絞り込む | `filtered_tasks` を呼ぶ | 前面の絞り込み結果が返る |
| TC-MCP-01h | MCP-01, MCP-02 | 別ファイルを2ウィンドウで開き、それぞれ別タスクを1件選択。背面を前面にしない | 引数なしの `selected_task`。`open_windows`。背面の `label` を `window` に渡した `selected_task`。無い `label`。`--screen selected_task --window <背面の label>`。`--screen replace_schedule --window <label>` | 引数なしは前面の選択。一覧は両方の `file` と `folder`、絶対パスなし、`front` は前面1件。`window` 指定は背面の選択で前面は変わらない。無いラベルは指定したウィンドウが開いていない旨。CLI の `--window` も背面。`replace_schedule` に `--window` は待ち受けへ送らず、標準エラーに「replace_schedule は前面ウィンドウだけを置き換えます。--window は使えません。」、終了コード 1 |
| TC-MCP-01d | MCP-01 | ブラウザ版 | 設定を開く | 「画面の状態を渡す」の欄が無い |
| TC-MCP-01f | MCP-01 | デスクトップ版、ファイルを開き、絞り込み・折りたたみ・選択・系統を変えた状態 | `write-schedule` で検証済みの JSON 全体を作り、`replace_schedule` を 1 回呼ぶ。同じ保存形式の JSON をもう一度呼ぶ。詳細パネルにフォーカスがある状態でも呼ぶ。起動復旧の衝突・ファイル無し・不正控えのダイアログが出ている状態でも呼ぶ | 1 回目は未保存になり、隅に「画面を置き換えました」が約 4 秒出る。ファイルの内容は変わらない。絞り込み・折りたたみ・ズーム・スクロール・系統は変わらない。選択は新文書に残るタスクだけ残る。⌘/Ctrl+Z で置き換え前に戻る。2 回目は未保存も履歴も変わらないが差分テキストは成功で返る。詳細のフォーカス中は「画面の操作が途中なので、置き換えられません。」起動復旧のダイアログ中は「起動の復旧が終わっていないので、置き換えられません。」確認ダイアログは出ない |
| TC-MCP-01g | MCP-01 | デスクトップ版。パス無しのサンプル、外部更新の帯、同じファイルの2ウィンドウ、開く・保存の途中、並べ替えの握りドラッグ中、10MB超・壊れたJSON・検証失敗の入力、差分が応答上限を超える置き換え | 各条件で `replace_schedule` を呼ぶか `--screen replace_schedule` で標準入力を渡す | パス無しの成功は「比べるファイルがありません」で失敗にしない。JSON として読めない・検証失敗・10MB 超はそれぞれの文で拒否し画面も履歴も変えない。差分が大きすぎても置き換えは残り「差分が大きすぎるため、差分テキストは返せません。」は失敗にしない。「ファイルに更新あり — 確認する」は消えない。背面ウィンドウの文書は変わらない。衝突が無い外部更新の確認、設定など別のダイアログ、ファイル操作中・並べ替えドラッグ中は「画面の操作が途中なので、置き換えられません。」SYNC-01 の衝突確認だけ開いているときは置き換えられ、確認は閉じる（TC-SYNC-01k） |
| TC-MCP-02 | MCP-02 | デスクトップ版、絞り込み・選択・未保存がある | 設定の「画面の状態を渡す」で read-screen を置き、同じ実行ファイルで `--screen open_windows`、`--screen schedule_diff`、`--screen baseline_diffs`、`--screen selected_task`、`--screen selected_tasks`、`--screen filtered_tasks`、`--screen current_schedule` をそれぞれ 1 回起動する。検証済み JSON を標準入力に渡し `--screen replace_schedule` を 1 回起動する。10MB を1バイト超える入力を標準入力に渡して `--screen replace_schedule` をもう 1 回起動する。Windows で実行ファイルが Local AppData 配下のときは、置いた SKILL.md のコマンド例も見る | MCP-01 と同じ内容が標準出力に出る。`current_schedule` はスケジュール JSON 全体が標準出力に出る。`replace_schedule` は差分テキストが標準出力に出る。終了コード 0。10MB 超の標準入力は待ち受けへ送らず標準エラーに「スケジュールが大きすぎるため、置き換えられません。」、終了コード 1。Windows で Local AppData 配下のとき、コマンド例は `"$LOCALAPPDATA/"` で始まり `--screen` と同じ1行にあり、`\AppData` を含まない |
| TC-MCP-02b | MCP-02 | デスクトップ版、アプリを終了した状態 | 置いた実行ファイルで `--screen schedule_diff` を起動する | 標準エラーにウィンドウが無い旨が出る。終了コード 1 |

TC-MCP-01、TC-MCP-01b、TC-MCP-01c は、表の OS 列どおり macOS、Ubuntu、Windows の配布物で同じ手順を見る。Issue #187 の第1〜2段で実機確認したのは macOS だけである。Windows の名前付きパイプと Ubuntu の Unix ドメインソケットは、Rust のテストで形を揃えてある。実機で登録した MCP から 4 ツールを呼ぶ確認は、macOS では済んでいる。Ubuntu と Windows は未確認である。

## リリース前確認

各 OS の配布物で、次を上から実行する。macOS（Apple Silicon）は GitHub Releases の dmg で同じ項目を見る。Intel Mac や開発中は、確認に使う Mac の上でビルドしたアプリでも同じ項目を見る。ブラウザ版では TC-SYNC-01c を加え、TC-SYNC-03 は対象外にする。

1. TC-FILE-01 でサンプル以外を開く
2. TC-EDIT-02 で移動し、TC-EDIT-10 で戻す
3. TC-FILE-02 で保存する
4. TC-FILTER-01 と TC-FILTER-08 で絞る
5. TC-EXPORT-01 で SVG を保存し、そのファイルを開いて行が描かれていることを見る
6. TC-SET-02 でメンバー名が出ることを見る。TC-SET-08 でステータス一覧が効くことを見る
7. TC-SET-03 で非稼働日が塗られることを見る
8. TC-SYNC-01 で、別のエディタで保存した内容が画面に反映されることを見る
9. TC-SYNC-03 で未保存の復元を、TC-SYNC-03d で保存済みの開き直しを見る。TC-WIN-01 で別ウィンドウ、TC-WIN-02 で他ウィンドウの知らせ、TC-WIN-03 で設定の共有を見る。TC-FILE-08 と TC-WIN-04 は手元の OS で `npm run tauri dev` を使って見る
10. TC-VIEW-05 と TC-VIEW-07 で赤とイナズマ線を見る
11. Ubuntu では deb のインストールと起動を見る。Apple Silicon の Mac では dmg のインストールと起動を見る（TC-SET-06u）。安定版の Release 後、Windows では Store の更新、実行エイリアス、更新欄、MCP のエイリアスを見る。ベータの Pre-release では NSIS が署名されていること（ジョブログ）、`schedule-viewer-codesign.cer` があること、証明書を二つのストアへ入れた PC で発行元が `schedule-viewer` になること、入れていない PC で SmartScreen の確認が出ることを見る
12. 安定版の `SHA256SUMS` に deb、dmg、`latest.json` など Release のファイルが含まれ、各ファイルのハッシュが一致することを見る。安定版の `latest.json` に `linux-x86_64` と `darwin-aarch64` があることを見る。ベータでは `windows-x86_64` も含まれる
13. 安定版の Release 本文にダウンロード手順とその版の CHANGELOG 節の本体（版見出しは無い）があり、番号がある項目の `(#番号)` がリンクになっていることを見る。番号が無い項目は本文のまま載る。CHANGELOG にその版の節が無いときは本文ジョブが失敗し、本文はダウンロード手順のまま残る。`[Unreleased]` と前の版の節は載らない。Pre-release の本文は確認用の短い文だけで、CHANGELOG 節は無い
14. TC-SET-06b から TC-SET-06q で自動更新、手動確認、ベータ保存、設定の変更履歴を見る（新しい Release が無いときは TC-SET-06e は Release 公開後に見る）
15. この仕組みを初めて使うベータでは、Windows にベータを入れたあと、安定版は Microsoft Store から入れ直すことを確認する
16. 安定版の Release 後、`updater-X` が Pre-release で `latest.json` だけを載せていることを見る。タグ `updater-X` は初回の位置のままである。より大きいメジャーの安定版が無いときだけ、その版が Latest になる
