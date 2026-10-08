# テスト仕様

何を自動で確かめ、何を手で確かめるかを定める。機能 ID は [外部仕様](external-spec.md#機能) のものである。テスト名は、各 `src/model/*.test.ts` の `it` と、`src-tauri/src/lib.rs` および `src-tauri/src/json_skills.rs` の `#[test]` の名前である。

## 方針

自動テストの対象は、`src/model/` の純粋関数と、Rust 側のパス検査である。画面操作、Konva の描画、Tauri のダイアログ、ファイルの監視、配布物は、手で確かめる。

どの機能 ID も、自動テストか下の手動テストケースの少なくとも一方に対応づける。

## テストの種類と実行方法

リポジトリ直下で実行する。Node.js 24 が必要である。Rust のテストには 1.98.1 と、[開発ガイド](development.md#ubuntu) のシステムパッケージも要る。

| 種類 | コマンド | 見ているもの |
| --- | --- | --- |
| Vitest | `npm test` | `src/**/*.test.ts`。環境は Node。先に検証器を生成する |
| Rust | `cd src-tauri && cargo test --locked` | `lib.rs` と `json_skills.rs` のパス検査 |
| ESLint | `npm run lint` | `src` と `scripts` の TypeScript。`dist`、`src-tauri`、`mockup`、`.cursor` は対象外 |
| 型検査 | `npm run build` の中の `tsc` | `src` |
| Clippy | `cd src-tauri && cargo clippy -- -D warnings` | Rust。警告をエラーにする |
| スケジュール検証 | `npm run check:schedule` | 引数なしなら `src/sample/schedule.ts` |
| カレンダー検証 | `npm run check:calendar` | 引数なしなら `examples/jp-2026.calendar.json` |
| メンバー検証 | `npm run check:members` | 引数なしなら `examples/playground.members.json` |
| バージョン | `npm run version:check` | 5ファイルのバージョン番号 |
| スキル同梱物 | `npm run build:validate-skill` のあと、CI と同じパスで `git diff --exit-code` | スキーマコピーと検証 bundle の差分 |

画面用のテストランナー（jsdom、Testing Library、Playwright）は入っていない。

## CI での実行

| ワークフロー | きっかけ | 実行するもの |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `develop` または `main` 向けの pull request | 変更パスがフロントなら `version:check`、`build`、`lint`、`test`、`check:schedule`、`check:calendar`、`check:members`、`build:validate-skill`、`npm audit --audit-level=high`、スキル同梱物の差分。Rust なら Clippy と `cargo test --locked`。最後に集約ジョブ `ci` が成功する |
| `.github/workflows/release.yml` | `main` への push | 環境 `release` の承認のあと、更新用署名付きの Ubuntu deb と Windows NSIS、`latest-linux-x86_64.json` と `latest-windows-x86_64.json`、それらをまとめた `latest.json`、Windows コード署名用の `schedule-viewer-codesign.cer`、`SHA256SUMS`、CHANGELOG から組み立てた Release 本文を GitHub Release へ出す |

`develop` への push だけでは CI は動かない。`docs/*.md` だけの変更ではフロントと Rust はスキップするが、集約ジョブ `ci` は成功する。詳細は [開発ガイド](development.md#ブランチと-ci) にある。

## 自動テスト一覧

### Vitest

| ファイル | ケース | 機能 ID |
| --- | --- | --- |
| `assigneeDisplay.test.ts` | `keeps null as unassigned` | VIEW-10 |
| 同上 | `resolves a known id to the display name` | VIEW-10 |
| 同上 | `marks an id missing from the catalog, including when none is selected` | VIEW-10 |
| 同上 | `keeps null and unknown ids, and drops resolved members` | FILTER-03 |
| 同上 | `appends the id only when the display name is duplicated` | VIEW-10 |
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
| `dependencies.test.ts` | `keeps a right elbow when the gap fits the arrow` | VIEW-08 |
| 同上 | `approaches from the left when the gap is shorter than the arrow` | VIEW-08 |
| 同上 | `routes around a bar that starts before the predecessor ends` | VIEW-08 |
| 同上 | `hits the segment, the elbow, and the endpoint` | EDIT-12 |
| 同上 | `picks the closer line and ignores points outside the threshold` | EDIT-12 |
| 同上 | `appends the predecessor in one list` | EDIT-12 |
| 同上 | `rejects a duplicate with the same message as a repeated predecessor id` | EDIT-12 |
| 同上 | `rejects a cycle with the edit dialog message` | EDIT-12, EDIT-05 |
| 同上 | `removes only that predecessor id` | EDIT-12 |
| `monthHeader.test.ts` | `formats year and month in Japanese` | NAV-02 |
| 同上 | `shows distant month labels` | NAV-02 |
| 同上 | `hides a month label that overlaps a fixed label` | NAV-02 |
| 同上 | `shows a month label that clears the fixed label with gap` | NAV-02 |
| 同上 | `does not treat a skipped month as obstruction for the next month` | NAV-02 |
| 同上 | `scales the gap with display size` | NAV-02 |
| 同上 | `estimates width from each label font size` | NAV-02 |
| 同上 | `hides the next label when the previous label uses a larger font size` | NAV-02 |
| `exportHtml.test.ts` | `puts the active filter into HTML and SVG` | EXPORT-01, EXPORT-02 |
| 同上 | `omits overlapping month header labels in month export but keeps grid lines` | NAV-02, EXPORT-02 |
| 同上 | `hatches tentative bars and labels them, and leaves committed bars solid` | VIEW-12, EXPORT-01 |
| 同上 | `hatches a tentative milestone and leaves a committed one solid` | VIEW-04, VIEW-12, EXPORT-01 |
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
| `taskTags.test.ts` | `keeps only tags that still exist, in document order` | FILTER-12 |
| `serialize.test.ts` | `writes tags after milestoneId and before note` | FILE-02 |
| `taskTags.test.ts` | `bumps schemaVersion from 6 to 7` | FILE-01 |
| 同上 | `quotes each tag for display` | FILE-07 |
| 同上 | `rejects whitespace-only, padded, and duplicate tags` | FILE-01 |
| 同上 | `accepts tags that differ only by case` | FILE-01 |
| `tasks.test.ts` | `copies fields and predecessors without changing successors` | EDIT-14, FILTER-12 |
| 同上 | `excludes tasks without note when noteSearch is set` | FILTER-02 |
| 同上 | `matches task linked to selected milestone id` | FILTER-07 |
| 同上 | `keeps only tasks without milestone when filter is none` | FILTER-07 |
| 同上 | `shows empty groups and categories when filters and lineage are clear` | VIEW-01, VIEW-03, FILTER-09 |
| 同上 | `hides empty groups when a filter is set` | FILTER-09 |
| 同上 | `hides empty groups when lineage is set` | FILTER-09 |
| `scheduleDiff.test.ts` | `says there is no difference when the documents match` | FILE-07 |
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
| `hierarchyRename.test.ts` | `trims the name and keeps the id` | EDIT-13 |
| 同上 | `keeps the original name when the input is blank` | EDIT-13 |
| 同上 | `rejects a duplicate category name` | EDIT-13 |
| 同上 | `rejects a duplicate name in the same category` | EDIT-13 |
| 同上 | `allows the same group name in another category` | EDIT-13 |
| 同上 | `keeps the original name when the input is blank` | EDIT-13 |
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
| `serialize.test.ts` | `omits empty note` | EDIT-06 |
| 同上 | `writes confidence after progress` | FILE-02 |
| 同上 | `writes milestone confidence after date` | FILE-02 |
| 同上 | `includes trimmed note` | EDIT-06 |
| `appKeyboard.test.ts` | `clears link mode on Escape and leaves a menu to close itself` | EDIT-12 |
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
| `timeline.test.ts` | `keeps the origin when a later start would scroll past the left edge` | EDIT-02, NAV-01 |
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
| `autoUpdate.test.ts` | `treats on as enabled`、localStorage の読み書き、更新確認の失敗を出さない条件 | SET-06 |
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

### Rust

| テスト | 確認すること | 機能 ID |
| --- | --- | --- |
| `sanitize_export_filename_removes_path_separators` | パス区切りを除く | EXPORT-04 |
| `sanitize_export_filename_uses_default_for_empty` | 空なら `schedule.html` | EXPORT-04 |
| `sanitize_export_filename_adds_extension` | 拡張子を足す | EXPORT-04, FILE-02 |
| `require_active_save_path_accepts_matching_path` | 開いているパスと一致すれば上書きできる | FILE-02 |
| `require_active_save_path_rejects_mismatch_and_missing` | パスの不一致と、ファイルを開いていない状態は拒否する | FILE-02 |
| `dedupe_keeps_focused_path` | 同じパスが複数あるとき、前面のウィンドウの未保存を残す | SYNC-03, WIN-01 |
| `recovery_owner_is_latest_focused_window_for_path` | 同じパスでは、最後に前面だったウィンドウが控えの書き手になる | SYNC-03, WIN-01 |
| `recovery_owner_falls_back_to_first_window` | 前面の記録が無いときは、一覧の最初のウィンドウが書き手になる | SYNC-03 |
| `recovery_owners_are_fixed_per_path` | 終了前の前面を、パスごとに控えの書き手として固定する | FILE-05, SYNC-03 |
| `recovery_close_keeps_front_window_only` | 同じパスが残る閉じでは控えを書かず、終了時は前面だけが書く | FILE-05, SYNC-03 |
| `migrate_moves_legacy_files_and_removes_them` | 古い記録を新しい控えとウィンドウ一覧へ移し、移し終えたら消す | SYNC-03 |
| `migrate_keeps_unreadable_legacy_recovery` | 読めない古い控えは消さず、ウィンドウ一覧も作らない | SYNC-03 |
| `path_recovery_key_is_stable` | パスから控えファイル名のハッシュが安定する | SYNC-03 |
| `choose_open_directory_uses_parent_or_home` | 初期フォルダは親があればそこ、無ければホーム | SYNC-03 |
| `validate_project_folder_rejects_relative_and_symlink` | 相対パスと、シンボリックリンクのプロジェクトフォルダを拒否する | SET-05 |
| `skill_destinations_stay_under_allowed_bases` | 書き先はユーザー全体か指定フォルダの3スキルに限る | SET-05 |
| `install_without_replace_leaves_existing` | 置き換えを確認するまでは既存を残し、何も書かない | SET-05 |
| `install_creates_real_parent_directories` | 無い `.cursor/skills` を実ディレクトリとして作る | SET-05 |
| `install_without_replace_treats_symlink_as_existing` | 壊れたシンボリックリンクも既存として、確認前は書かない | SET-05 |
| `install_replaces_symlink_destination` | 宛先のシンボリックリンクはリンクだけ外し、リンク先は残す | SET-05 |
| `install_does_not_write_through_tool_dir_symlink` | `.cursor` がシンボリックリンクなら置かない | SET-05 |
| `place_staged_skill_restores_original_when_copy_fails` | 入れ替えのコピーに失敗したら元のフォルダを残す | SET-05 |
| `install_keeps_earlier_skill_when_a_later_copy_fails` | 後続のコピーに失敗しても、先に置けたスキルは残る | SET-05 |
| `uninstall_removes_only_bundled_skill_folders` | 外すのは3スキルだけで、別名のスキルは残す | SET-05 |
| `uninstall_does_not_remove_through_tool_dir_symlink` | `.cursor` がシンボリックリンクなら外さない | SET-05 |
| `uninstall_removes_broken_symlink_at_destination` | 宛先の壊れたシンボリックリンクはリンクだけ外す | SET-05 |
| `uninstall_does_not_follow_symlink_inside_skill` | スキル内のシンボリックリンクの先は消さない | SET-05 |

## 自動テストが無いところ

次のモジュールには、専用のテストが無い。一部は他のテストから間接的に使われる。

| モジュール | 状態 |
| --- | --- |
| `dependencies.ts` | 破綻の境界と系統は未テスト。線の追加、除去、当たりはテストしている。循環の検出は、`taskEditCycles.test.ts` が `scheduleSemantics.ts` 側でもテストしている |
| `timeline.ts` | 期限超過、イナズマ線、ズーム段階は未テスト |
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
2. `timeline.ts`。期限超過とイナズマ線
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

壊れた JSON は、必須項目を消すか、schemaVersion を 2 にして作る。外部からの書き換えは、開いたファイルを別のエディタで保存して作る。

## 手動テストケース

前提に書いていないときは、デスクトップ版を起動し、サンプルが表示された状態から始める。ブラウザ版で結果が違う場合は、そのケースに書く。

| ID | 機能 | 前提 | 手順 | 期待結果 |
| --- | --- | --- | --- | --- |
| TC-FILE-01 | FILE-01 | 検証済みの JSON がある | 「開く」でそのファイルを選ぶ | 画面がその内容になり、見出しがファイル名になる |
| TC-FILE-01c | FILE-01 | 検証済みの JSON がある | ⌘/Ctrl+O でそのファイルを選ぶ | 「開く」と同じように開く。ダイアログが開いているときは効かない |
| TC-FILE-01f | FILE-01 | サンプル | ☰ を開き、下、上、Home、End を押す | 最初の項目にフォーカスが移る。キーで項目を移動できる。Escape で閉じる |
| TC-FILE-01b | FILE-01 | schemaVersion 2 の JSON がある | 「開く」で選ぶ | 開かず、理由が出る。それまでの保存先は変わらない |
| TC-FILE-01d | FILE-01, FILE-04 | schemaVersion 3 で、確度の無い JSON がある | 「開く」で選ぶ。見出しを見てから保存する | 開く。バーと、確度の無いマイルストンのひし形はベタ塗りで、見出しは未保存にならない。保存すると schemaVersion 7 になり、全部のタスクとマイルストンに `confidence` があり、カテゴリとグループに `id` がある。マイルストンがあるときは `milestoneGroups` と `groupId` もある |
| TC-FILE-01e | FILE-01, FILE-04 | schemaVersion 4 で、カテゴリとグループに `id` が無い JSON がある | 「開く」で選ぶ。同じファイルをもう一度開く | どちらも未保存にならない。付けたカテゴリとグループの `id` は同じである。保存すると schemaVersion 7 になる |
| TC-FILE-01g | FILE-01, FILE-04 | schemaVersion 6 の JSON がある | 「開く」で選ぶ。保存する | 未保存にならず開く。保存すると schemaVersion 7 になる。タグを付けていないタスクに `tags` は無い |
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
| TC-FILE-07 | FILE-07 | パスのあるファイルを開き、タスクの日付をずらす | 「差分を表示」を開く | そのタスクの start と end の旧値、新値、暦日の差が出る |
| TC-FILE-07b | FILE-07 | 差分ダイアログが開いている | 「コピー」を押す | ダイアログの全文が写る。ファイルは増えない |
| TC-FILE-07c | FILE-07 | 差分の出る編集をしたあと保存する | 「差分を表示」を開く | 「差はありません」になる |
| TC-FILE-07d | FILE-07 | パスのあるファイルを開いている | タスクを追加する | 場所と全フィールドが出て、兄弟の並びは出ない |
| TC-FILE-07j | FILE-07 | パスのあるファイルを開いている | 新しいタスクを、既存のタスクのあいだに追加する | 追加のブロックと、並びの行が出る。右辺に新しいタスクが含まれる |
| TC-FILE-07e | FILE-07 | 先行を持つタスクがある | その先行タスクを削除する | 削除したタスクと、先行から外れた残りのタスクの変更が出る。空のグループは削除にならない |
| TC-FILE-07f | FILE-07 | パスのあるファイルを開いている | タスクを削除し、同じ名前で追加する | 削除と追加の二つになる |
| TC-FILE-07g | FILE-07 | 未保存の編集を残したまま、外部の更新を「画面の編集を残す」にした | 「差分を表示」を開く | 今のファイルとの差が出る |
| TC-FILE-07h | FILE-07 | サンプル、またはブラウザ版 | 「差分を表示」を開く | 「比べるファイルがありません」と出る |
| TC-FILE-07i | FILE-07 | 開いているパスのファイルを、検証に失敗する内容へ変える | 「差分を表示」を開く | 差分は出ず、読み込みエラーになる |
| TC-FILE-07k | FILE-07 | パスのあるファイルを開き、未保存にする | 状態バーの「未保存」を押す | 差分ダイアログが開く |
| TC-FILE-07l | FILE-07 | パスのあるファイルを開き、編集する | ⌘/Ctrl+Shift+D を押す | 差分の全文がコピーされる。開く、保存、別名保存の途中は効かない |
| TC-SYNC-01 | SYNC-01 | デスクトップ版でファイルを開き、未保存は無い | 別のエディタでその JSON を保存する | 約1.5秒以内に画面に反映し、「ファイルを反映しました」と出る |
| TC-SYNC-01b | SYNC-01 | 未保存の編集がある | 別のエディタでファイルを保存する | 「読み直す」か「画面の編集を残す」かを聞く。残すと「ファイルに更新あり — 読み直す」が出る |
| TC-SYNC-01c | SYNC-01 | ブラウザ版でファイルを開く | 別のエディタでファイルを保存する | 画面は変わらない |
| TC-SYNC-02 | SYNC-02 | 開いたあと、別のエディタでファイルを変える | 「保存」を押す | 「上書き保存」「別名保存」「取り消し」が出る。取り消しではファイルも画面も変わらない |
| TC-SYNC-03 | SYNC-03 | TC-FILE-05b のあと、ファイルは変えない | アプリを起動する | 同じファイルが未保存のまま開く |
| TC-SYNC-03b | SYNC-03 | 控えがあるあいだに、別のエディタでファイルを変える | アプリを起動する | 「ファイルを開く」か「未保存の編集を戻す」かを聞く。開くはダイアログにせず、そのファイルの最新内容になる |
| TC-SYNC-03c | SYNC-03 | 未保存のまま閉じたあと、対象ファイルを消す | アプリを起動する | 未保存が画面に戻り、ファイルが無いと出る。「未保存の編集を戻す」でその内容が残る。そのあと、同じ欠落では監視のファイルダイアログは出ない |
| TC-SYNC-03d | SYNC-03 | ファイルを開き、保存して閉じる | アプリを起動する | 同じファイルが保存済みで開く。絞り込みやズームは初期状態である |
| TC-SYNC-03e | SYNC-03 | 保存して閉じたあと、そのファイルを消す | アプリを起動する | 見つからないと知らせてサンプルになる。ファイルダイアログは出ない。その状態で閉じると、次はサンプルのままである |
| TC-SYNC-03f | SYNC-03 | 保存済みのファイルを閉じた直後 | アプリを起動し、見出しがファイル名になるまでバーをドラッグする | 復旧が終わるまで日付は変わらない。終わったあとはドラッグできる |
| TC-SYNC-03g | SYNC-03 | 保存済みのファイルを閉じた直後 | アプリを起動し、見出しがファイル名になる前に別のエディタでその JSON を保存する。ファイル名になったあと少し待つ | 変えた内容が画面に出る。起動が終わったあとはバーをドラッグできる |
| TC-WIN-01 | WIN-01 | デスクトップ版。検証済みの JSON がある | 「新しいウィンドウで開く」で選ぶ | 元のウィンドウは残り、新しいウィンドウにその内容が開く |
| TC-WIN-01b | WIN-01 | 同上 | ⌘/Ctrl+Shift+O で選ぶ | 同上。ブラウザ版ではブラウザのショートカットになる |
| TC-WIN-01c | WIN-01 | 未保存の編集がある | 「新しいウィンドウで開く」 | 破棄の確認は出ず、新しいウィンドウだけ開く |
| TC-WIN-02 | WIN-02 | 同じファイルを2つのウィンドウで開く。片方は未保存 | 未保存の側で外部更新を「画面の編集を残す」にする | もう一方の隅に「確認待ち」が出て、確認が終わるまで残る。押すと、確認を出したウィンドウが前面になる。確認を終えると知らせは消える |
| TC-WIN-02b | WIN-02 | 同じファイルを2つ開く。両方保存済み | 片方で外部更新を即時反映する | もう一方の隅に「反映した」が数秒出る |
| TC-WIN-03 | SET-02, SET-01, SET-04 | 2つのウィンドウを開く | 片方でメンバー、表示サイズ、配色、一覧の幅、行の密度、イナズマ線、一覧の列を変える | もう一方も同じ設定になる |
| TC-FILE-02d | FILE-02, SYNC-02 | 開いたあと、別のエディタでファイルを変える | 「ファイルが更新されています」が出るまで ⌘/Ctrl+S を続けて押す | 確認は一つだけ出る。上書きは一回だけ行われる |
| TC-SYNC-01d | SYNC-01 | デスクトップ版でファイルを開いている | そのファイルを消し、連続して読めなくなるまで待つ | ファイルダイアログが出る。読み取り失敗の汎用メッセージは出ない。キャンセルすると見出しのファイル名は残る。上書き保存はできず、別名保存はできる |
| TC-VIEW-01 | VIEW-01 | サンプル | 左の行を上から見る | カテゴリ、グループ、タスクの順で、JSON の配列順に並ぶ |
| TC-VIEW-02 | VIEW-02 | 進行中のタスクがある | そのバーを見る | 薄青の地に、進捗率の濃い部分がある。完了は緑、未着手は灰 |
| TC-VIEW-03 | VIEW-03 | 子の期間が離れているグループ | 親の行を見る。HTML で書き出す | タスクバーより細い帯で、途切れた期間は点線、つながる期間は塗り。両端に下向きの角がある。書き出しも同じ |
| TC-VIEW-04 | VIEW-04 | playground または長い名前のマイルストンがある JSON | 右端まで横スクロールする。月表示でも見る。全角24文字を超える名前にカーソルを乗せる。近いひし形の手前で切れる名前も見る。日・週・月を切り替える | 右端まで送ったとき、次のひし形が無い名前と年月が最後まで読める。全角24文字を超える名前は「…」になり、ホバーでチャート内に全文が読める。近いひし形の手前で切れることと、日・週・月の切り替えは今までどおり。グループごとに帯が積まれる。ひし形が重なるときだけ段が増える。左はグループ名。チャート全体の縦線は無い |
| TC-FILTER-11 | FILTER-11 | マイルストングループが2つ以上ある JSON | 絞り込みの帯の線で1つをオフにする。書き出す | 帯と書き出しからその線が消える。タスク行は変わらない。札とすべて解除で戻る |
| TC-FILTER-11b | FILTER-11, EDIT-11 | マイルストングループが2つ以上あり、各グループにマイルストンがある JSON | 左のマイルストングループ名の行の空きを右クリックし「非表示」を選ぶ。札を押す。別の行で「この行だけ表示」を選ぶ。残った1行を右クリックし、メニューを見る。そのあと最後の1行も非表示にする。書き出す | 帯と左の行が消える。札でそのグループだけ戻る。「この行だけ表示」で他がオフになり、オフしたグループごとに札が出る。帯に別のグループ行が無くなったあとは、「この行だけ表示」は出ない。全部オフで帯の高さは0。ひし形の右クリックメニューは今どおり。線を引くモードと見出しではメニューが出ない。タスクの選択は変わらない |
| TC-VIEW-04b | VIEW-04, VIEW-12 | 未確定と確定のマイルストンがある | ひし形を、ライトとダークで見る。HTML と SVG に書き出す | 未確定は斜線、確定は塗りつぶし。書き出しも同じ |
| TC-VIEW-05 | VIEW-05 | 終了日が昨日の未完了タスクと、終了日が今日の未完了タスク | 両方のバーを見る | 昨日で終わるものだけが赤い |
| TC-VIEW-06 | VIEW-06 | 対応マイルストンより終了日が後のタスクと、当日で終わるタスク | 行を見る | 後のタスクだけ、右が半透明の赤になり「超過」が出る |
| TC-VIEW-07 | VIEW-07 | 期限超過の行と、進行中で開始日が明日の行 | 橙の線を見る | 超過の行では終了日まで左へ、未来に開始する着手済みの行では開始日まで右へ折れる |
| TC-VIEW-08 | VIEW-08 | 後続の開始が先行の終了より前の組と、同じ日に始まる組 | 線を見る | 先行の終了より前に始まる組の線だけが赤い。どちらかを折りたたむと線は消える |
| TC-VIEW-08b | VIEW-08 | 先行と後続が見えている | 後続の開始を超えるまで先行の終了を延ばし、離す前に線を見る。同じ日まで戻してから離す | 離す前に赤く太くなる。同じ日では赤くならない。離してから「前後: 破綻のみ」に入る |
| TC-VIEW-08c | VIEW-08 | 先行の終了と後続の開始が数日以内の組 | 月表示まで縮小して線を見る。週表示でも見る | どちらの表示でも矢印の頭が後続バーの左の外にあり、後続の行へ向かう線が分かる |
| TC-VIEW-09 | VIEW-09 | カレンダー未設定で日表示 | 背景を見る | 土日だけが薄い灰。月表示では日ごとに塗らない |
| TC-VIEW-10 | VIEW-10 | 使用中カタログがある | 割り当てなし、一致する ID、存在しない ID の行を見る。割り当てなしを選択し、カーソルを乗せる。期限超過の割り当てなし行も見る。ライトとダーク、HTML と SVG の書き出しも確かめる | 一覧では「未割当」は琥珀色の札で切れず、名前付きは薄い文字、一致は表示名、「メンバー不明」と ID は紫の札。選択中とホバーでも札の地色が残る。期限超過でも「未割当」は赤くならない。チャートのバーに破線や上端の色は出ない。書き出しも同じ札である |
| TC-VIEW-11 | VIEW-11 | ノートがあるタスクと無いタスク | ノートアイコンを押す | 色が違い、本文が出る。無いタスクは「ノートはありません」 |
| TC-NAV-01 | NAV-01 | 期間が画面より広い | チャートをドラッグする。チャート本体、日付の行、マイルストン帯で、クリックせず二本指を横へ滑らせる。ホイールと Shift+ホイールも試す | ドラッグは縦横。本体ではホイールの縦は上下、横の量は左右。斜めは一緒に動く。日付の行とマイルストン帯では縦と横の量が左右。Shift+ホイールは横。端で止まる |
| TC-NAV-01b | NAV-01 | 期間が画面より広く、行が画面より多い | ⌘ または Ctrl を押しながら上下左右を押す。押し続ける。端まで押す | 上で縦に戻り、下で進む。左で過去、右で未来へ動く。縦は左の一覧と一緒に動く。上下は 1 行分、左右も同じ画面上の距離である。押しているあいだは連続して動き、端で止まる |
| TC-NAV-01c | NAV-01 | 検索欄、選択欄、またはボタンにフォーカスがある。別途、ダイアログと右クリックメニューを開く | 矢印キーだけを押し、続けて ⌘ または Ctrl と矢印を押す | 矢印キーだけではその欄の操作のままである。⌘ または Ctrl と矢印ではチャートが動く。ダイアログが開いているあいだは動かない。右クリックメニューは、この操作で閉じる |
| TC-NAV-01d | NAV-01 | 行が画面より多い。別途、一覧が画面に収まるスケジュールと、折りたたんだカテゴリまたはグループ | 縦にスクロールする。次の見出しが上へ来るまで進める。折りたたんだ行の下も見る。一覧が画面に収まるときはスクロールしない | 展開中のカテゴリとグループが、日付ヘッダーとマイルストン帯の下に残る。次の見出しで入れ替わる。折りたたんだ行は残らない。一覧が画面に収まるときは残らない |
| TC-NAV-01e | NAV-01, NAV-02 | 行が画面より多く、期間が画面より広い | 左の名前の一覧の上で、クリックせず二本指を横へ滑らせる。ホイールと Shift+ホイールを試す。さらに Ctrl または ⌘ とホイールを回す | ホイールの縦で左の一覧とチャートが一緒に上下へ動く。横の量では左右へ動く。Shift+ホイールでは横へ動く。Ctrl または ⌘ とホイールでは、チャートの左端の日付を保って拡大・縮小する |
| TC-NAV-02 | NAV-02 | 週表示 | Ctrl または ⌘ を押してホイールを回す | ポインタの位置を保ったまま拡大し、十分拡大すると「日表示」、縮小すると「月表示」になる |
| TC-NAV-02b | NAV-02 | サンプル | 「日」「週」「月」を順に押す | 1日あたりの幅が 40px、22px、8px になり、見出しの表示単位が切り替わる |
| TC-NAV-02c | NAV-02 | 今日が期間内 | 「今日」を押す | 縦位置と選択は変わらず、横スクロールだけが今日が見える位置へ動く |
| TC-NAV-02d | NAV-02 | 期間が複数月にまたがる | 月表示にする。左端が前の月のまま、次の月の1日が左へ寄る位置まで横スクロールする。表示サイズを 50% と 200% にし、隣の月と左端の固定月のあいだに隙間が残ることを確かめる。表示サイズを大きくし、1日の幅を 3px まで縮める。日表示と週表示にも切り替える | 重なる月の文字だけが消え、左端の固定月と月の区切り線は残る。50% と 200% では隣の月の文字のあいだに隙間が残る。縮小して隣の月が重なるときも同じ。日表示と週表示の見出しは変わらない |
| TC-NAV-03 | NAV-03 | 横にスクロールした状態 | 「全体」を押す | 期間が幅に入り、横位置が先頭に戻る |
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
| TC-FILTER-03 | FILTER-03 | 割り当てなし、メンバー不明、名前を表示できる担当が混在 | 「割り当てなし」を選ぶ | 割り当てなしとメンバー不明が残り、名前を表示できる担当のタスクは消える |
| TC-FILTER-03b | FILTER-03 | 同上 | 特定のメンバーを選ぶ | その ID だけが残り、メンバー不明は出ない |
| TC-FILTER-04 | FILTER-04 | 完了と未完了が混在 | 「完了以外」を選ぶ | 完了のタスクが消える |
| TC-FILTER-05 | FILTER-05 | 期限超過と期限内が混在 | 「期限超過」を選ぶ | VIEW-05 のタスクだけが残る |
| TC-FILTER-06 | FILTER-06 | 破綻している組と、していない組 | 「前後: 破綻のみ」を選ぶ | 破綻している線の両端だけが残る |
| TC-FILTER-07 | FILTER-07 | マイルストン付きと無しが混在 | 「なし」を選ぶ | 対応が無いタスクだけが残る |
| TC-FILTER-07b | FILTER-07 | 同上 | 特定のマイルストンを選ぶ | それを指すタスクだけが残る |
| TC-FILTER-08 | FILTER-08 | 枝分かれした前後関係 | 枝の途中を選んで「系統」を押す | その起点の先行と後続だけが残る。起点を通らない枝は出ない。もう一度で解除する |
| TC-FILTER-08b | FILTER-08 | 系統を表示している | 別のタスクを右クリックし、「系統を表示」を選ぶ | 起点がそのタスクに切り替わる。同じタスクなら「系統を解除」で外れる |
| TC-FILTER-09 | FILTER-09 | あるグループのタスクがすべて完了 | 「完了以外」を選ぶ | そのグループの行も消える。追加ダイアログでは、そのグループをまだ選べる |
| TC-FILTER-10 | FILTER-10 | サンプル | 「確度」で「未確定」、次に「確定」を選ぶ | 未確定だけ、次に確定だけが残る。選んでいたタスクの選択は外れる |
| TC-FILTER-12 | FILTER-12 | サンプルにタグ付きタスクがある | 「タグ」で二つオンにする。担当など別の条件も入れる | どちらかのタグを持つタスクだけが残る。タグの無いタスクは残らない。ほかの条件も満たすものだけが残る |
| TC-FILTER-12b | FILTER-12 | タグを二つ以上オンにしている | 札を一つ押す。「すべて解除」でも試す | 押したタグだけ外れ、ほかのタグは残る。「すべて解除」で絞り込みは戻り、系統は残る |
| TC-FILTER-12c | FILTER-12 | タグをオンにしている | ファイルを開き直す | タグの選択は無くなる |
| TC-FILTER-12d | FILTER-12 | サンプルでファイル内のタグをすべてオンにできる | すべてオンにする | タグ付きタスクだけが残り、タグの無いタスクは残らない |
| TC-FILTER-12e | FILTER-12 | タグが 9 件以上ある JSON を開ける | 「絞り込み」でタグ欄を見る | 8 件まで見え、それより多いときは一覧の中をスクロールする |
| TC-FILTER-12f | FILTER-12 | タグが無い JSON を開ける | 「絞り込み」でタグ欄を見る | チェックは出ず、「タグはありません」と出る |
| TC-FILTER-12g | FILTER-12 | タグで絞っている | 選んだタグを文書から消す（詳細パネルで外すなど） | 消えたタグだけ選択から外れる。ほかに選んだタグがあれば残る |
| TC-FILTER-12h | FILTER-12 | サンプルにタグ付きとタグ無しのタスクがある | 「タグ」は一つもオンにしない | タグでは絞らない。タグの無いタスクも残る |
| TC-VIEW-12 | VIEW-12 | サンプル | 未確定と確定のバーを、ライトとダークで見る。超過もある未確定を見る。サンプルの「本番リリース」も見る | 未確定は斜線で、確定はベタ塗り。色はステータスと期限超過のまま。一覧に「未確定」は出ない。超過があるときは「超過」だけ出る。本番リリースのひし形は斜線で、他のマイルストンは塗りつぶし |
| TC-EDIT-01 | EDIT-01 | サンプル | バーをクリックし、次に左のタスク行をクリックし、背景をクリックする | バーと左の行で選択され端のハンドルが出る。背景で外れる |
| TC-EDIT-01c | EDIT-01, NAV-01 | 見えているタスクが複数ある。行が画面より多い | ↑↓で選択を移す。見えている行を選んだあと、左の行をクリックして選び直す。端で止まる | カテゴリ行とグループ行は飛ばす。見えている行では縦位置は変わらない。画面外の行へ移したときだけ、入るところまでスクロールする |
| TC-EDIT-01d | EDIT-01, NAV-01 | 横にスクロールした状態で、バーが画面にかかっているタスクがある | そのバーをクリックする。次に、横に見えていないタスクを選ぶ | かかっているバーを選んでも横位置は変わらない。見えていないバーを選ぶと、開始の手前が見える位置へ寄る |
| TC-EDIT-01b | EDIT-01 | タスクを選択している | 絞り込みを変える | 選択が外れる |
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
| TC-EDIT-14 | EDIT-14, EDIT-10 | 担当、確度、ノート、先行があるタスク | 右クリックの「複製」を開き、名前だけ変えて追加する。取り消す | 元の直後に、担当・確度・ノート・先行を写したタスクが追加される。後続の相手は変わらない。取り消し 1 回で消える |
| TC-EDIT-14b | EDIT-14 | 複製ダイアログ | キャンセル、または Escape を押す。別途、終了日を開始日より前にして追加する | タスクは増えない。日付が不正なときはダイアログが開いたまま |
| TC-EDIT-14c | EDIT-14, FILTER-10 | 確定のタスクがあり、確度を「未確定」で絞っている | そのタスクを複製して追加する。次に確度を「確定」に絞り、確定のタスクを複製する | 未確定で絞っているときは「すべて」に戻り、複製が見える。確定で絞っているときは「確定」のまま、複製が見える |
| TC-EDIT-15 | EDIT-15, EDIT-10 | 同じグループにタスクが3件以上ある | 真ん中のタスク行の左端の握りをドラッグして、別の位置で離す。取り消す | ドラッグ中は半透明のタスク行がポインタに付く。離すと左の一覧とチャートの順が変わる。日付と先行は変わらない。取り消し 1 回で戻る |
| TC-EDIT-15b | EDIT-15, NAV-05 | 名前が幅に収まらないタスクがある | その名前をドラッグする。次に左端の握りをドラッグして順を変える | 名前は動かない。マウスを乗せると全文が出る。握りをドラッグすると並べ替えになる |
| TC-EDIT-15c | EDIT-15, FILTER-01 | 同じグループにタスクが複数ある | タスク名で1件だけ残す絞り込みをかけ、行の左端の握りをドラッグする | 並べ替えは始まらない |
| TC-EDIT-15d | EDIT-15, FILE-07 | パスのあるファイルを開いている | 同じグループで順だけ変え、「差分を表示」を開く | `並び タスク` の行が出る。末尾に足しただけの追加では並びは出ない |
| TC-EDIT-15e | EDIT-01, EDIT-11, EDIT-15 | 未選択のタスクと、別の選択中タスクがある | 未選択タスクの左端の握りをクリック、右クリックする。次に同じ握りを 3px 以内で動かして離す | 選択は変わらず、未選択タスクの詳細パネルやメニューは開かない。並べ替えも始まらない |
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
| TC-EDIT-12 | EDIT-12 | 見えているタスクを選択 | 「線を引く」または ⌘/Ctrl+L を押す。L だけも押す | モードに入る。ボタンに起点の名前が出る。チャート上端の帯は「次にクリックしたタスクを後続にします。Esc で中止」になる。選択が無いときと、L だけでは入らない |
| TC-UI-01 | NAV-02 | サンプル | ? と F1 を押す。☰ の「ショートカット一覧」も開く | 一覧ダイアログが開き、Escape で閉じる。検索欄にフォーカスがあるときは ? でも F1 でも開かない |
| TC-UI-02 | NAV-08 | サンプル | 起動直後は案内が出ないことを見る。上段の「案内」、☰ の「操作の案内」、⌘ または Ctrl+K で「操作の案内」を開く | 見出し「スケジュールの作り方」「画面」「タグ」「気づきにくい操作」「色と線」が出る。スキルの2文はブラウザ版でも出る。本文にフォーカスしたままキーで末尾までスクロールできる。Escape で閉じる。中の「ショートカット一覧」で案内が閉じ、ショートカット一覧が開く。? と F1 は一覧を開く |
| TC-UI-02b | NAV-08 | ブラウザ版 | 案内を開く | 「気づきにくい操作」に、外部ファイルの反映と自動更新の文が無い |
| TC-UI-02c | NAV-08 | デスクトップ版 | 案内を開く | 外部ファイルの反映と自動更新の文が出る |
| TC-EDIT-12b | EDIT-12 | 線を引くモード | カーソルを動かし、タスクバー、左の一覧、それ以外へ乗せる | 起点の右端から折れ線が追随する。バーの上ではその左端まで、一覧の上ではチャートの左端まで伸びる。乗ったタスクバーだけ別の輪郭になる。起点、親バー、ひし形は強調されない。モードを終えると線は消える |
| TC-EDIT-12c | EDIT-12 | 線を引くモード | 別のタスクバーをクリックする。続けて Esc、起点の再クリック、「線を引く」、⌘/Ctrl+L を試す。親バー、ひし形、背景もクリックする | クリックで線が 1 本加わる。取り消しの 1 ステップで戻り、モードは残る。Esc、起点、ボタン、⌘/Ctrl+L では結ばずに終わる。親バー、ひし形、背景では終わらない |
| TC-EDIT-12d | EDIT-12 | 線を引くモード | チャートをドラッグする。ホイールの縦と横、Shift+ホイール、⌘ または Ctrl と矢印で動かす | ドラッグではスクロールも移動も期間変更もひし形の日付変更もしない。ホイールの縦と横と矢印ではスクロールし、追随する線も動く。ダブルクリックと Enter では詳細パネルの名前欄にフォーカスが移らない |
| TC-EDIT-12e | EDIT-12 | すでに結ばれている組と、循環する組 | そのタスクをクリックする | 保存されない。詳細パネルと同じ理由が出る。モードは残る |
| TC-EDIT-12f | EDIT-12 | 折りたたみか絞り込みで見えていないタスクがある | 線を引くモードで、見えているタスクだけをクリックする | 見えていない相手へは引けない。詳細パネルの先行と後続は今どおり足せる |
| TC-EDIT-12g | EDIT-12 | 見えている線がある | 線にカーソルを合わせて Delete または Backspace を押す。別の線を右クリックして「線を外す」を選ぶ。バーの上でも Delete を押す | 線は 1 本だけ消え、確認は出ない。取り消しの 1 ステップで戻る。タスクは残る。バーやひし形の上ではタスクの削除確認が開く。ツールバーの「削除」はタスクを消す |
| TC-EDIT-10 | EDIT-10 | バーを動かした直後 | ⌘/Ctrl+Z を押し、続けてやり直す | 移動が戻り、やり直しで再度動く。検索欄にフォーカスがあるときは動かない |
| TC-EDIT-10b | EDIT-10 | 取り消しできる編集がある | 別のファイルを開く | 取り消しできなくなる |
| TC-EXPORT-01 | EXPORT-01 | サンプル | 「書き出し」で SVG を選んで保存する | SVG ファイルができる。キャンセルではできない |
| TC-EXPORT-02 | EXPORT-02 | タスク名で数件に絞る | HTML で書き出す | 絞り込みで残った行だけが入り、絞り込みで隠したタスクは入らない。画面の外にスクロールしている行も入る |
| TC-EXPORT-03 | EXPORT-03 | 書き出しの行が 10,000 を超えるデータ | 「書き出し」を実行する | ファイルを作らず、行数の上限を理由に出す |
| TC-EXPORT-04 | EXPORT-04 | タイトルに `/` や `:` がある | 書き出しの保存ダイアログを開く | 提案名からそれらの文字が除かれ、選んだ形式の拡張子が付く |
| TC-SET-01 | SET-01 | 設定の「表示」 | 「200%」を選び、アプリを起動し直す。次に「自動」を選び、再起動する | 文字と行が大きくなり、再起動後も維持される。「自動」も localStorage に残り、次の起動でも自動のままである |
| TC-SET-01b | SET-01 | 表示サイズが自動、または 100% | ⌘ または Ctrl と +、=、− を押す。押し続ける。200% と 50% でも押す。検索欄、開いている設定、右クリックメニュー、線を引くモードでも押す | 一段ずつ変わり、端では止まる。自動は隣の固定段になり、再起動後も残る。設定の選択が追従する。右クリックメニューは閉じ、線を引くモードは残る。ページはズームしない |
| TC-SET-01c | SET-01 | 左一覧の列をすべて出す | 開始が 9 月 19 日、終了が 9 月 21 日、進捗が 30% のタスクと、超過のある行と無い行を見る | `09/19`、`09/21`、日数、`30%`、超過、担当が、行をまたいで同じ位置に揃う。超過が無い行もその幅は空く。名前にマウスを乗せても列は動かない |
| TC-SET-04 | SET-04 | 設定の「表示」 | 「ダーク」を選び、HTML を書き出す | 画面と書き出しが暗い配色になる。再起動後もダークのまま。「システム設定に合わせる」に戻すと保存値は消える |
| TC-SET-02 | SET-02 | 正しいメンバー JSON | 「取り込み…」で入れ、使用中にする | 見出しの近くにカタログ名が出て、一致する ID が名前になる。スケジュール JSON にはメンバーが増えない |
| TC-SET-02b | SET-02 | 同じカタログがすでにある | もう一度取り込む | 上書きしてよいかを聞く |
| TC-SET-03 | SET-03 | 平日を非稼働にするカレンダー | 「稼働日」で取り込む | 日表示でその日が薄い灰になる。バーの長さは暦日のまま |
| TC-SET-03b | SET-03 | カレンダー取り込み済み | 「外す」を押す | 土日だけを塗る状態に戻る |
| TC-SET-05 | SET-05 | デスクトップ版、置き先に同名が無い | 設定の「JSON作成スキルを置く」で Cursor、ユーザー全体を選び「置く」 | write-schedule、write-members、write-calendar が `~/.cursor/skills/` に置かれ、パスが示される |
| TC-SET-05b | SET-05 | 上記のいずれかが既にある | もう一度「置く」 | 上書き確認が出る。上書き後、置いたパスが示される |
| TC-SET-05c | SET-05 | 指定フォルダへ Claude Code を置く。`~/.claude/skills/` に同名がある | 「置く」 | 置いたあと、個人用が先に使われる旨が出る |
| TC-SET-05d | SET-05 | ブラウザ版 | 設定の「JSON作成スキルを置く」を開く | デスクトップ版でのみ置ける旨が出て、「置く」は押せない |
| TC-SET-05e | SET-05 | デスクトップ版、ユーザー全体に3つがある | 「外す」で確認のあと外す | 3つが消え、外したパスが示される。skills フォルダと別名スキルは残る |
| TC-SET-06 | SET-06 | ブラウザ版 | 設定を開く | 「更新」の欄が無い |
| TC-SET-06b | SET-06 | デスクトップ版、初回起動 | 設定の「更新」を見る | 「起動時に更新を確認する」はオフである |
| TC-SET-06c | SET-06 | デスクトップ版、2つのウィンドウ | 片方で自動更新をオンにする | もう一方もオンになる。オンにした直後は更新を確認しない |
| TC-SET-06d | SET-06 | 自動更新オフ | 起動する | 更新を確認しない |
| TC-SET-06e | SET-06 | 自動更新オン、Release に新しい版がある | 起動する | 起動復旧のあと入れ直す。失敗したときは隅に短く出て、今の版のまま使える。印は消える。その次の起動では変更内容のダイアログは出ない。あとから同じ版を手で入れても出ない |
| TC-SET-06f | SET-06 | 自動更新オン、サンプルが未保存 | 新しい版で入れ直す流れでキャンセルする | その起動では入れ直さない |
| TC-SET-06g | SET-06 | 自動更新オン、パスのあるファイルが未保存 | 新しい版で入れ直す | 確認は出ず、再起動後に控えが戻る |
| TC-SET-06h | SET-06 | 自動更新オン、同じパスを2つのウィンドウで開き、前面で未保存 | 新しい版で入れ直す | 確認は出ず、再起動後に前面の控えが戻る |
| TC-SET-06i | SET-06 | 自動更新で入れ直したあと（印あり） | 起動する | OS のフォーカスがあるウィンドウだけにその版の変更が出る。閉じるまで更新確認は始まらない。閉じたあと印が消え、次の起動では出ない |
| TC-SET-06j | SET-06 | 手で入れた版 | 起動する | 変更内容のダイアログは出ない |

## リリース前確認

各 OS の配布物で、次を上から実行する。macOS は、確認に使う Mac の上でビルドしたアプリで同じ項目を見る。ブラウザ版では TC-SYNC-01c を加え、TC-SYNC-03 は対象外にする。

1. TC-FILE-01 でサンプル以外を開く
2. TC-EDIT-02 で移動し、TC-EDIT-10 で戻す
3. TC-FILE-02 で保存する
4. TC-FILTER-01 と TC-FILTER-08 で絞る
5. TC-EXPORT-01 で SVG を保存し、そのファイルを開いて行が描かれていることを見る
6. TC-SET-02 でメンバー名が出ることを見る
7. TC-SET-03 で非稼働日が塗られることを見る
8. TC-SYNC-01 で、別のエディタで保存した内容が画面に反映されることを見る
9. TC-SYNC-03 で未保存の復元を、TC-SYNC-03d で保存済みの開き直しを見る。TC-WIN-01 で別ウィンドウ、TC-WIN-02 で他ウィンドウの知らせ、TC-WIN-03 で設定の共有を見る
10. TC-VIEW-05 と TC-VIEW-07 で赤とイナズマ線を見る
11. Ubuntu では deb のインストールと起動を見る。Windows では Release の NSIS が署名されていること（ジョブログ）、`schedule-viewer-codesign.cer` があること、証明書を二つのストアへ入れた PC で発行元が `schedule-viewer` になること、入れていない PC で SmartScreen の確認が出ることを見る
12. `SHA256SUMS` に deb、NSIS、`.cer`、`latest.json` が含まれ、各ファイルのハッシュが一致することを見る。`latest.json` に `linux-x86_64` と `windows-x86_64` があることを見る
13. 対象 Release の本文にダウンロード手順とその版の CHANGELOG 節があり、項目の Issue 番号がリンクになっていることを見る。`[Unreleased]` と前の版の節は無い
14. TC-SET-06b から TC-SET-06j で自動更新と変更内容の表示を見る（新しい Release が無いときは TC-SET-06e と TC-SET-06i は Release 公開後に見る）
