# テスト仕様

何を自動で確かめ、何を手で確かめるかを定める。機能 ID は [外部仕様](external-spec.md#機能) のものである。テスト名は、各 `src/model/*.test.ts` の `it` と、`src-tauri/src/lib.rs` の `#[test]` の名前である。

## 方針

自動テストの対象は、`src/model/` の純粋関数と、Rust 側のパス検査である。画面操作、Konva の描画、Tauri のダイアログ、ファイルの監視、配布物は、手で確かめる。

どの機能 ID も、自動テストか下の手動テストケースの少なくとも一方に対応づける。

## テストの種類と実行方法

リポジトリ直下で実行する。Node.js 24 が必要である。Rust のテストには 1.98.1 と、[開発ガイド](development.md#ubuntu) のシステムパッケージも要る。

| 種類 | コマンド | 見ているもの |
| --- | --- | --- |
| Vitest | `npm test` | `src/**/*.test.ts`。環境は Node。先に検証器を生成する |
| Rust | `cd src-tauri && cargo test --locked` | `lib.rs` のパス検査 |
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
| `.github/workflows/ci.yml` | `develop` 向けの pull request | 変更パスがフロントなら `version:check`、`build`、`lint`、`test`、`check:schedule`、`check:calendar`、`check:members`、`build:validate-skill`、スキル同梱物の差分。Rust なら Clippy と `cargo test --locked` |
| `.github/workflows/release.yml` | `main` への push | Ubuntu の deb と Windows の NSIS を GitHub Release へ出し、`SHA256SUMS` を付ける |

`develop` への push だけでは CI は動かない。`docs/*.md` だけの変更では、CI のどちらも動かない。詳細は [開発ガイド](development.md#ブランチと-ci) にある。

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
| `exportHtml.test.ts` | `puts the active filter into HTML and SVG` | EXPORT-01, EXPORT-02 |
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
| 同上 | `reuses the lowest free lane after overlapping labels end` | EDIT-07 |
| `nonWorkingDay.test.ts` | `defaults to Sat/Sun when calendar is null` | VIEW-09 |
| 同上 | `respects workingDays override on weekends` | VIEW-09, SET-03 |
| 同上 | `treats an empty weekends list as no weekday holidays` | VIEW-09 |
| 同上 | `does not paint days past the schedule end` | VIEW-09 |
| 同上 | `respects nonWorkingDays on weekdays` | VIEW-09 |
| `rows.test.ts` | `relaxes filters that would hide a newly added task` | EDIT-08, EDIT-14 |
| 同上 | `keeps a search when only surrounding spaces differ` | EDIT-08, FILTER-01 |
| 同上 | `keeps filters that still show a newly added task` | EDIT-08 |
| 同上 | `keeps filters that match the duplicated task` | EDIT-14, FILTER-10 |
| 同上 | `matches note substring independently of name` | FILTER-02, FILTER-09 |
| 同上 | `keeps only the selected confidence` | FILTER-10 |
| 同上 | `excludes tasks without note when noteSearch is set` | FILTER-02 |
| 同上 | `matches task linked to selected milestone id` | FILTER-07 |
| 同上 | `keeps only tasks without milestone when filter is none` | FILTER-07 |
| `scheduleDiff.test.ts` | `says there is no difference when the documents match` | FILE-07 |
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
| 同上 | `uses the command key on mac and ctrl elsewhere` | EDIT-12 |
| 同上 | `blocks fields but not buttons` | EDIT-12 |
| 同上 | `ignores undo, zoom-like modifiers, and alt combinations` | EDIT-10 |
| 同上 | `scrolls one row with ctrl or meta and an arrow` | NAV-01 |
| 同上 | `scrolls while an edit key target is focused` | NAV-01 |
| 同上 | `does not scroll for a bare arrow, shift, alt, or a dialog` | NAV-01 |
| 同上 | `scrolls when both ctrl and meta are held` | NAV-01 |
| 同上 | `marks save, open, and find so the browser action can be cancelled` | FILE-02, NAV-05 |
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
| 同上 | `stores fixed ratios and clears key for auto` | SET-01 |
| `chartHitTest.test.ts` | `extends the selected bar by the resize handle` | EDIT-02, EDIT-03, EDIT-12 |
| 同上 | `does not extend the handle while drawing a link` | EDIT-12 |
| 同上 | `prefers a task or milestone over a link` | EDIT-11, EDIT-12 |
| 同上 | `hits a link only when the pointer misses bars and diamonds` | EDIT-12 |
| 同上 | `places the link preview at the sidebar, bar start, or pointer` | EDIT-12 |
| 同上 | `hits a milestone diamond inside the slop and misses outside it` | VIEW-04, EDIT-11 |
| `colorScheme.test.ts` | `accepts light and dark` | SET-04 |
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
| `recovery_targets_path_accepts_only_the_draft_path` | 控えに書いたパス以外は読まない | SYNC-03 |
| `resolve_remembered_path_prefers_last_schedule_over_recovery` | 覚えたパスを控えのパスより優先する | SYNC-03 |
| `resolve_remembered_path_uses_recovery_when_last_schedule_is_absent` | 覚えたパスが無ければ控えのパスを使う | SYNC-03 |
| `resolve_remembered_path_rejects_broken_last_schedule_and_skips_broken_recovery` | 壊れた前回の記録は拒否し、壊れた控えはパスに使わない | SYNC-03 |
| `choose_open_directory_uses_parent_or_home` | 初期フォルダは親があればそこ、無ければホーム | SYNC-03 |

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
| `examples/playground.schedule.json` | サンプルに近いがノートは無い | 引数なしの `check:schedule` では見ない |
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
| TC-FILE-01d | FILE-01, FILE-04 | schemaVersion 3 で、確度の無い JSON がある | 「開く」で選ぶ。見出しを見てから保存する | 開く。バーと、確度の無いマイルストンのひし形はベタ塗りで、見出しは未保存にならない。保存すると schemaVersion 5 になり、全部のタスクとマイルストンに `confidence` があり、カテゴリとグループに `id` がある |
| TC-FILE-01e | FILE-01, FILE-04 | schemaVersion 4 で、カテゴリとグループに `id` が無い JSON がある | 「開く」で選ぶ。同じファイルをもう一度開く | どちらも未保存にならない。付けたカテゴリとグループの `id` は同じである。保存すると schemaVersion 5 になる |
| TC-FILE-02 | FILE-02 | ファイルを開き、バーを動かして未保存にする | 「保存」を押す | 見出しから「未保存」が消え、ファイルの内容が画面と一致する |
| TC-FILE-02c | FILE-02 | 同上 | ⌘/Ctrl+S を押す。検索欄にフォーカスがあるときも押す | 「保存」と同じように保存される。編集ダイアログが開いているときは保存されない |
| TC-FILE-03 | FILE-03 | サンプルを編集する | 「別名保存」で新しいパスを選ぶ | そのパスに JSON ができ、次の「保存」はそのパスへ書く |
| TC-FILE-03b | FILE-03 | サンプルを編集する | ⌘/Ctrl+Shift+S で新しいパスを選ぶ | 「別名保存」と同じになる |
| TC-FILE-04 | FILE-04 | ファイルを開いた直後 | 絞り込みだけを変える | 見出しは「未保存」にならない |
| TC-FILE-04b | FILE-04 | ファイルを開いている | バーを1日動かす | 見出しが「未保存」になる |
| TC-FILE-05 | FILE-05 | サンプルを編集し、未保存にする | ウィンドウを閉じる | 破棄して閉じるかを聞く。破棄すると控えは残らない |
| TC-FILE-05b | FILE-05 | パスがあるファイルを未保存のままにする | ウィンドウを閉じる | 確認なしで閉じ、次回その未保存を戻せる |
| TC-FILE-06 | FILE-06 | タスク名を変えた直後 | 「JSON を表示」を開く | 保存と同じ形で、変えた名前が見える。ファイルは増えない |
| TC-FILE-07 | FILE-07 | パスのあるファイルを開き、タスクの日付をずらす | 「差分を表示」を開く | そのタスクの start と end の旧値、新値、暦日の差が出る |
| TC-FILE-07b | FILE-07 | 差分ダイアログが開いている | 「コピー」を押す | ダイアログの全文が写る。ファイルは増えない |
| TC-FILE-07c | FILE-07 | 差分の出る編集をしたあと保存する | 「差分を表示」を開く | 「差はありません」になる |
| TC-FILE-07d | FILE-07 | パスのあるファイルを開いている | タスクを追加する | 場所と全フィールドが出て、兄弟の並びは出ない |
| TC-FILE-07e | FILE-07 | 先行を持つタスクがある | その先行タスクを削除する | 削除したタスクと、先行から外れた残りのタスクの変更が出る。空のグループは削除にならない |
| TC-FILE-07f | FILE-07 | パスのあるファイルを開いている | タスクを削除し、同じ名前で追加する | 削除と追加の二つになる |
| TC-FILE-07g | FILE-07 | 未保存の編集を残したまま、外部の更新を「画面の編集を残す」にした | 「差分を表示」を開く | 今のファイルとの差が出る |
| TC-FILE-07h | FILE-07 | サンプル、またはブラウザ版 | 「差分を表示」を開く | 「比べるファイルがありません」と出る |
| TC-FILE-07i | FILE-07 | 開いているパスのファイルを、検証に失敗する内容へ変える | 「差分を表示」を開く | 差分は出ず、読み込みエラーになる |
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
| TC-FILE-02d | FILE-02, SYNC-02 | 開いたあと、別のエディタでファイルを変える | 「ファイルが更新されています」が出るまで ⌘/Ctrl+S を続けて押す | 確認は一つだけ出る。上書きは一回だけ行われる |
| TC-SYNC-01d | SYNC-01 | デスクトップ版でファイルを開いている | そのファイルを消し、連続して読めなくなるまで待つ | ファイルダイアログが出る。読み取り失敗の汎用メッセージは出ない。キャンセルすると見出しのファイル名は残る。上書き保存はできず、別名保存はできる |
| TC-VIEW-01 | VIEW-01 | サンプル | 左の行を上から見る | カテゴリ、グループ、タスクの順で、JSON の配列順に並ぶ |
| TC-VIEW-02 | VIEW-02 | 進行中のタスクがある | そのバーを見る | 薄青の地に、進捗率の濃い部分がある。完了は緑、未着手は灰 |
| TC-VIEW-03 | VIEW-03 | 子の期間が離れているグループ | 親の行を見る | 半分の高さで、途切れた期間は薄い色になる |
| TC-VIEW-04 | VIEW-04 | 日付が近く名前が長いマイルストンが複数ある | 日付ヘッダーの下を見る | ひし形と名前が出る。重なるときは段が増える。チャート全体の縦線は無い |
| TC-VIEW-04b | VIEW-04, VIEW-12 | 未確定と確定のマイルストンがある | ひし形を、ライトとダークで見る。HTML と SVG に書き出す | 未確定は斜線、確定は塗りつぶし。書き出しも同じ |
| TC-VIEW-05 | VIEW-05 | 終了日が昨日の未完了タスクと、終了日が今日の未完了タスク | 両方のバーを見る | 昨日で終わるものだけが赤い |
| TC-VIEW-06 | VIEW-06 | 対応マイルストンより終了日が後のタスクと、当日で終わるタスク | 行を見る | 後のタスクだけ、右が半透明の赤になり「超過」が出る |
| TC-VIEW-07 | VIEW-07 | 期限超過の行と、進行中で開始日が明日の行 | 橙の線を見る | 超過の行では終了日まで左へ、未来に開始する着手済みの行では開始日まで右へ折れる |
| TC-VIEW-08 | VIEW-08 | 後続の開始が先行の終了より前の組と、同じ日に始まる組 | 線を見る | 先行の終了より前に始まる組の線だけが赤い。どちらかを折りたたむと線は消える |
| TC-VIEW-08b | VIEW-08 | 先行と後続が見えている | 後続の開始を超えるまで先行の終了を延ばし、離す前に線を見る。同じ日まで戻してから離す | 離す前に赤く太くなる。同じ日では赤くならない。離してから「前後: 破綻のみ」に入る |
| TC-VIEW-08c | VIEW-08 | 先行の終了と後続の開始が数日以内の組 | 月表示まで縮小して線を見る。週表示でも見る | どちらの表示でも矢印の頭が後続バーの左の外にあり、後続の行へ向かう線が分かる |
| TC-VIEW-09 | VIEW-09 | カレンダー未設定で日表示 | 背景を見る | 土日だけが薄い灰。月表示では日ごとに塗らない |
| TC-VIEW-10 | VIEW-10 | 使用中カタログがある | 割り当てなし、一致する ID、存在しない ID の行を見る | 「割り当てなし」は破線、「メンバー不明」は点線と ID、一致は表示名 |
| TC-VIEW-11 | VIEW-11 | ノートがあるタスクと無いタスク | ノートアイコンを押す | 色が違い、本文が出る。無いタスクは「ノートはありません」 |
| TC-NAV-01 | NAV-01 | 期間が画面より広い | チャートをドラッグし、ホイールと Shift+ホイールを回す | ドラッグは縦横、ホイールは縦、Shift+ホイールは横に動く |
| TC-NAV-01b | NAV-01 | 期間が画面より広く、行が画面より多い | ⌘ または Ctrl を押しながら上下左右を押す。押し続ける。端まで押す | 上で縦に戻り、下で進む。左で過去、右で未来へ動く。縦は左の一覧と一緒に動く。上下は 1 行分、左右も同じ画面上の距離である。押しているあいだは連続して動き、端で止まる |
| TC-NAV-01c | NAV-01 | 検索欄、選択欄、またはボタンにフォーカスがある。別途、ダイアログと右クリックメニューを開く | 矢印キーだけを押し、続けて ⌘ または Ctrl と矢印を押す | 矢印キーだけではその欄の操作のままである。⌘ または Ctrl と矢印ではチャートが動く。ダイアログが開いているあいだは動かない。右クリックメニューは、この操作で閉じる |
| TC-NAV-02 | NAV-02 | 週表示 | Ctrl または ⌘ を押してホイールを回す | ポインタの位置を保ったまま拡大し、十分拡大すると「日表示」、縮小すると「月表示」になる |
| TC-NAV-03 | NAV-03 | 横にスクロールした状態 | 「Fit」を押す | 期間が幅に入り、横位置が先頭に戻る |
| TC-NAV-04 | NAV-04 | タスクがあるグループ | 三角を二度押す | 一度で配下の行が隠れ、親バーは残る。二度で戻る |
| TC-NAV-05 | NAV-05 | 左の幅に収まらないタスク名 | その名前を横にドラッグする | 続きが読める。担当と「超過」は動かない |
| TC-NAV-06 | NAV-06 | 左の一覧とチャートの境界 | 境界を横にドラッグし、ダブルクリックする。ウィンドウを狭めてから広げる | 一覧の幅が変わり、チャートは残った幅に合う。ダブルクリックで既定の幅に戻る。名前の横ずらしは残る。ウィンドウを狭めると表示だけ縮み、広げると戻る |
| TC-NAV-06b | NAV-06 | 境界にフォーカスがある | 左右キーを押す。続けて ⌘ または Ctrl と左右を押す。さらに Shift または Alt も一緒に押す | 左右キーだけでは幅が変わる。⌘ または Ctrl を押すと幅は変わらず、チャートが横にスクロールする。Shift または Alt も一緒のときは、幅もスクロールも変わらない |
| TC-FILTER-01 | FILTER-01 | サンプル | タスク名の一部を入れる | その文字を含むタスクだけが残る |
| TC-FILTER-01b | FILTER-01 | サンプル | ⌘/Ctrl+F を押す | 「タスク名で検索」にフォーカスが移り、入っている文字が選択される |
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
| TC-VIEW-12 | VIEW-12 | サンプル | 未確定と確定のバーを、ライトとダークで見る。超過もある未確定を見る。サンプルの「本番リリース」も見る | 未確定は斜線で、確定はベタ塗り。色はステータスと期限超過のまま。左に「未確定」が出る。超過もあるときは「未確定」「超過」の順。本番リリースのひし形は斜線で、他のマイルストンは塗りつぶし |
| TC-EDIT-01 | EDIT-01 | サンプル | バーをクリックし、次に背景をクリックする | バーで選択され端のハンドルが出る。背景で外れる。左の行をクリックしても選択されない |
| TC-EDIT-01b | EDIT-01 | タスクを選択している | 絞り込みを変える | 選択が外れる |
| TC-EDIT-02 | EDIT-02 | タスクを選択できる | ⌘ または Ctrl を押しながらバーを横へドラッグして離す | 開始と終了が同じ日数だけ動く。修飾が無いドラッグはスクロールのまま |
| TC-EDIT-02b | EDIT-02 | タスクを選択できる | ⌘ または Ctrl を押しながらバーを横へドラッグし、離す前に日付を見る。離したあと、修飾キー無しでドラッグする。名前の横ずらしと、ひし形のドラッグもする | ドラッグ中は開始日と終了日が月/日で、棒と重ならずに出る。離すと消える。スクロール、名前の横ずらし、ひし形では出ない |
| TC-EDIT-02c | EDIT-02 | 前後の線が複数ある | 1本の端のタスクだけをドラッグし、終了日を非稼働日まで動かす | 触っていない線の色は変わらない。見えている行も変わらない。「休」は出ず、バーの長さは暦日のまま |
| TC-EDIT-03 | EDIT-03 | タスクを選択している | 右端を左へ、1日より短くなるところまでドラッグする | 1日で止まり、終了日が開始日より前にならない。止まった位置の開始日と終了日が出る |
| TC-EDIT-03b | EDIT-03 | タスクを選択している | 左端をドラッグする | 開始日と終了日が出る。1日より短い位置では、その日付で止まる |
| TC-EDIT-04 | EDIT-04 | サンプル | バーをダブルクリックし、名前を空にして保存する | 保存されず、理由が出る。Escape では変更が残らない |
| TC-EDIT-04c | EDIT-04 | タスクを選択している | Enter を押す | 編集ダイアログが開く。検索欄にフォーカスがあるときは開かない |
| TC-EDIT-04d | EDIT-04, EDIT-10 | タスクを選択している | 編集で確度を変えて保存し、取り消す | 確度だけが変わり、日付は動かない。取り消し 1 回で戻る |
| TC-EDIT-05 | EDIT-05 | 3件以上のタスク | 編集で、自分を先行にしようとする。次に、循環する先行を保存する | 自分は候補に出ない。循環は保存されず、理由が出る |
| TC-EDIT-05d | EDIT-05 | 編集ダイアログを開いている | 先行の候補を開き、Escape を押す。もう一度 Escape を押す | 一度目は候補だけが閉じ、ダイアログは残る。二度目でダイアログが閉じ、変更は残らない |
| TC-EDIT-05b | EDIT-05 | タスクが50件を超えるスケジュール | 先行の検索を空のまま開く | 「さらに絞り込んでください」と出る |
| TC-EDIT-05c | EDIT-05 | カテゴリ名とグループ名が長い後続がある | そのタスクの編集を開く。後続にカーソルを乗せる。先行も見る | タスク名は省略されず見える。階層の行は長いとき省略される。ホバーで「カテゴリ / グループ / タスク名」の全文が出る。先行も同じである |
| TC-EDIT-06 | EDIT-06 | ノートが無いタスク | ノートアイコンから文字を保存し、次に空白だけを保存する | 一度目でノートが付き、二度目でノートが消える |
| TC-EDIT-07 | EDIT-07 | マイルストンがある | ひし形を横にドラッグして離す。次にダブルクリックで名前を空白にして保存する | 日付は離した位置になる。ドラッグ中の月/日は出ない。空白の名前は元の名前のまま残る |
| TC-EDIT-07b | EDIT-07, VIEW-12 | マイルストンが 0 件でもよい | 「マイルストン追加」で名前と日付を、確度は未確定のまま保存する。次に確度を確定にして足す | 未確定は斜線、確定は塗りつぶしのひし形が出る。取り消し 1 回で、最後に足したものだけ消える |
| TC-EDIT-07c | EDIT-07 | 「マイルストン追加」を開いている | 名前を空白だけ、または日付を空にして保存する。次にキャンセルと Escape を試す | どれでもマイルストンは増えない |
| TC-EDIT-07d | EDIT-07 | 同じ名前と日付のマイルストンがある | 「マイルストン追加」で同じ名前と日付を保存する | もう 1 件足される |
| TC-EDIT-07e | EDIT-07 | タスクが指しているマイルストンがある | ひし形を右クリックして「削除」を確認する | マイルストンが消え、指していたタスクの対応だけが外れる。日付は変わらない。取り消し 1 回でマイルストンと対応が戻る |
| TC-EDIT-07f | EDIT-07 | マイルストンがある | ツールバーの「削除」を見る。Delete を押す | マイルストンは消えない |
| TC-EDIT-07g | EDIT-07 | タスクを選択し、系統を出し、そのマイルストンで絞っている | そのマイルストンを削除する | 絞り込みは「すべて」に戻る。選択と系統は残る。取り消しても絞り込みは「すべて」のまま |
| TC-EDIT-08 | EDIT-08 | タスクを選択し、「完了」で絞っている | 「追加」で、選択中のグループに今日から1日のタスクを足す | そのグループの末尾に、割り当てなし・未着手・未確定で足される。絞り込みは「すべて」に戻り、新しい行が選択される |
| TC-EDIT-08c | EDIT-08, FILTER-10 | 確度を「確定」で絞っている | タスクを追加する。次に、確度を「未確定」に戻してから追加する | 「確定」のときだけ「すべて」に戻る。「未確定」のまま追加したタスクは残って見える |
| TC-EDIT-08b | EDIT-08 | 追加ダイアログ | 終了日を開始日より前にして保存する | 追加されない |
| TC-EDIT-14 | EDIT-14, EDIT-10 | 担当、確度、ノート、先行があるタスク | 右クリックの「複製」を開き、名前だけ変えて追加する。取り消す | 元の直後に、担当・確度・ノート・先行を写したタスクが追加される。後続の相手は変わらない。取り消し 1 回で消える |
| TC-EDIT-14b | EDIT-14 | 複製ダイアログ | キャンセル、または Escape を押す。別途、終了日を開始日より前にして追加する | タスクは増えない。日付が不正なときはダイアログが開いたまま |
| TC-EDIT-14c | EDIT-14, FILTER-10 | 確定のタスクがあり、確度を「未確定」で絞っている | そのタスクを複製して追加する。次に確度を「確定」に絞り、確定のタスクを複製する | 未確定で絞っているときは「すべて」に戻り、複製が見える。確定で絞っているときは「確定」のまま、複製が見える |
| TC-EDIT-09 | EDIT-09 | 先行を持つタスクを選択 | 「削除」を確認する | タスクが消え、他の先行からも外れ、残ったタスク同士はつながらない |
| TC-EDIT-09b | EDIT-09 | タスクを選んでいない | 「削除」を見る | 押せない |
| TC-EDIT-09c | EDIT-09 | タスクを選択している | Delete または Backspace を押す | 削除確認が開く。検索欄にフォーカスがあるときは開かない。キャンセルでは消えない |
| TC-EDIT-11 | EDIT-11 | サンプル | バーを右クリックし、「ノート」を選ぶ。次に左のタスク行を右クリックする。選択中は端のハンドルも右クリックする。カテゴリ行も右クリックする | ノートが開く。左のタスク行は右クリックで選択され、メニューが出る。左クリックでは選択されない。チャートの空白ではメニューが出ない。端のハンドルでもバーと同じメニューが出る。カテゴリ行では「名前を変更」だけが出る |
| TC-EDIT-11c | EDIT-11, EDIT-10, VIEW-12 | 未確定のタスクと、確定のタスクがある | それぞれを右クリックし、確度の項目を選ぶ。取り消す | 未確定には「確定にする」、確定には「未確定にする」だけが出る。日付は動かない。取り消し 1 回で戻る |
| TC-EDIT-11d | EDIT-11, EDIT-07, EDIT-10, VIEW-12 | 未確定のマイルストンと、確定のマイルストンがある | それぞれを右クリックし、確度の項目を選ぶ。取り消す | 未確定には「確定にする」、確定には「未確定にする」が出る。日付は動かない。ひし形の斜線が切り替わる。取り消し 1 回で戻る。タスクの選択は変わらない |
| TC-EDIT-11b | EDIT-11 | マイルストンがある | ひし形を右クリックし、「編集」を選ぶ | 「編集」、確度の切り替え、「削除」が出る。選択は変わらない。編集を選ぶと名前、日付、確度の編集が開く |
| TC-EDIT-13 | EDIT-13, EDIT-10 | サンプルで、カテゴリを折りたたむ | 左のカテゴリ行をダブルクリックし、名前を変えて保存する。同じ名前のカテゴリへも変えてみる。空白だけでも保存する。取り消す | 折りたたみは残る。重複する名前は保存されない。空白だけなら元の名前のまま閉じる。取り消し 1 回で名前が戻る。グループ行も同じである |
| TC-EDIT-13b | EDIT-13 | 別のカテゴリに同じグループ名がある | そのグループを、別カテゴリと同じ名前に変える | 保存できる。同じカテゴリの中の既存名には変えられない |
| TC-EDIT-12 | EDIT-12 | 見えているタスクを選択 | 「線を引く」または ⌘/Ctrl+L を押す。L だけも押す | モードに入る。ボタンに起点の名前が出る。ヒントは「次にクリックしたタスクを後続にします。Esc で中止」になる。選択が無いときと、L だけでは入らない |
| TC-EDIT-12b | EDIT-12 | 線を引くモード | カーソルを動かし、タスクバー、左の一覧、それ以外へ乗せる | 起点の右端から折れ線が追随する。バーの上ではその左端まで、一覧の上ではチャートの左端まで伸びる。乗ったタスクバーだけ別の輪郭になる。起点、親バー、ひし形は強調されない。モードを終えると線は消える |
| TC-EDIT-12c | EDIT-12 | 線を引くモード | 別のタスクバーをクリックする。続けて Esc、起点の再クリック、「線を引く」、⌘/Ctrl+L を試す。親バー、ひし形、背景もクリックする | クリックで線が 1 本加わる。取り消しの 1 ステップで戻り、モードは残る。Esc、起点、ボタン、⌘/Ctrl+L では結ばずに終わる。親バー、ひし形、背景では終わらない |
| TC-EDIT-12d | EDIT-12 | 線を引くモード | チャートをドラッグする。ホイール、Shift+ホイール、⌘ または Ctrl と矢印で動かす | ドラッグではスクロールも移動も期間変更もひし形の日付変更もしない。ホイールと矢印ではスクロールし、追随する線も動く。ダブルクリックと Enter では編集が開かない |
| TC-EDIT-12e | EDIT-12 | すでに結ばれている組と、循環する組 | そのタスクをクリックする | 保存されない。編集ダイアログと同じ理由が出る。モードは残る |
| TC-EDIT-12f | EDIT-12 | 折りたたみか絞り込みで見えていないタスクがある | 線を引くモードで、見えているタスクだけをクリックする | 見えていない相手へは引けない。編集ダイアログの先行と後続は今どおり足せる |
| TC-EDIT-12g | EDIT-12 | 見えている線がある | 線にカーソルを合わせて Delete または Backspace を押す。別の線を右クリックして「線を外す」を選ぶ。バーの上でも Delete を押す | 線は 1 本だけ消え、確認は出ない。取り消しの 1 ステップで戻る。タスクは残る。バーやひし形の上ではタスクの削除確認が開く。ツールバーの「削除」はタスクを消す |
| TC-EDIT-10 | EDIT-10 | バーを動かした直後 | ⌘/Ctrl+Z を押し、続けてやり直す | 移動が戻り、やり直しで再度動く。検索欄にフォーカスがあるときは動かない |
| TC-EDIT-10b | EDIT-10 | 取り消しできる編集がある | 別のファイルを開く | 取り消しできなくなる |
| TC-EXPORT-01 | EXPORT-01 | サンプル | 「書き出し」で SVG を選んで保存する | SVG ファイルができる。キャンセルではできない |
| TC-EXPORT-02 | EXPORT-02 | タスク名で数件に絞る | HTML で書き出す | 絞り込みで残った行だけが入り、絞り込みで隠したタスクは入らない。画面の外にスクロールしている行も入る |
| TC-EXPORT-03 | EXPORT-03 | 書き出しの行が 10,000 を超えるデータ | 「書き出し」を実行する | ファイルを作らず、行数の上限を理由に出す |
| TC-EXPORT-04 | EXPORT-04 | タイトルに `/` や `:` がある | 書き出しの保存ダイアログを開く | 提案名からそれらの文字が除かれ、選んだ形式の拡張子が付く |
| TC-SET-01 | SET-01 | 設定の「表示」 | 「200%」を選び、アプリを起動し直す | 文字と行が大きくなり、再起動後も維持される。「自動」に戻すと保存値は消える |
| TC-SET-04 | SET-04 | 設定の「表示」 | 「ダーク」を選び、HTML を書き出す | 画面と書き出しが暗い配色になる。再起動後もダークのまま。「システム設定に合わせる」に戻すと保存値は消える |
| TC-SET-02 | SET-02 | 正しいメンバー JSON | 「取り込み…」で入れ、使用中にする | 見出しの近くにカタログ名が出て、一致する ID が名前になる。スケジュール JSON にはメンバーが増えない |
| TC-SET-02b | SET-02 | 同じカタログがすでにある | もう一度取り込む | 上書きしてよいかを聞く |
| TC-SET-03 | SET-03 | 平日を非稼働にするカレンダー | 「稼働日」で取り込む | 日表示でその日が薄い灰になる。バーの長さは暦日のまま |
| TC-SET-03b | SET-03 | カレンダー取り込み済み | 「外す」を押す | 土日だけを塗る状態に戻る |

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
9. TC-SYNC-03 で未保存の復元を、TC-SYNC-03d で保存済みの開き直しを見る
10. TC-VIEW-05 と TC-VIEW-07 で赤とイナズマ線を見る
11. Ubuntu では deb のインストールと起動、Windows では NSIS と SmartScreen の表示を見る
12. `SHA256SUMS` と配布物のハッシュが一致することを見る
