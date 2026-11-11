# テスト仕様

何を自動で確かめ、何を手で確かめるかを定める。機能 ID は [外部仕様](external-spec.md#機能) のものである。Vitest の Node 側のテスト名は、各 `src/model/*.test.ts` の `it` と、`src-tauri/src/lib.rs`、`src-tauri/src/recent_files.rs`、`src-tauri/src/json_skills.rs`、`src-tauri/src/mcp_app_data.rs`、`src-tauri/src/mcp_stdio.rs`、`src-tauri/src/schedule_drop.rs`、および Windows では `src-tauri/src/mcp_bridge_windows.rs` の `#[test]` の名前である。Rust の統合試験は `src-tauri/tests/mcp_stdio_client.rs` と `src-tauri/tests/mcp_running_app.rs` の `#[test]` 名を [Rust 表](#rust) に書く。jsdom 側は `src/**/*.test.tsx` の `it` 名を [自動テスト一覧](#自動テスト一覧) の Vitest 表に書く。

## 方針

自動テストの対象は、`src/model/` の純粋関数、Rust 側のパス検査、および `src/**/*.test.tsx`（jsdom）で描くコンポーネントの DOM 特性である。Konva の描画、Tauri のダイアログ、ファイルの監視、配布物は、手で確かめる。

どの機能 ID も、自動テストか下の手動テストケースの少なくとも一方に対応づける。

## テストの種類と実行方法

リポジトリ直下で実行する。Node.js 24 が必要である。Rust のテストには 1.98.1 と、[開発ガイド](development.md#ubuntu) のシステムパッケージも要る。

| 種類 | コマンド | 見ているもの |
| --- | --- | --- |
| node:test | `npm test` の中の `node --test scripts/*.test.mjs` | `scripts/*.test.mjs`。操作マニュアルサイトは、同じページ内の `#見出し` をその HTML の見出し id と照合する |
| Vitest（Node） | `npm test` | `src/**/*.test.ts`。環境は Node。先に検証器を生成する |
| Vitest（jsdom） | `npm test` | `src/**/*.test.tsx`。jsdom と Testing Library。React コンポーネントの DOM 特性（Issue #490、C3 のあと） |
| Rust | Linux では `xvfb-run -a cargo test --locked`（`src-tauri`） | `lib.rs`、`json_skills.rs`、MCP 関連のパスとフレーム検査、`tests/mcp_stdio_client.rs` の標準入出力と `--screen` CLI（GUI 不要）、`tests/mcp_running_app.rs` の起動中 GUI 向け MCP 統合試験（Vite 1420・`DISPLAY` 必須。Linux CI は xvfb） |
| ESLint | `npm run lint` | `src` と `scripts` の TypeScript。`dist`、`src-tauri`、`mockup`、`.cursor` は対象外。`src/model/**` と `src/hooks/**` には import 境界（Issue #490 PR 1）。警告の上限を超えると失敗する。上限は [package.json](../package.json) の `lint`（`--max-warnings`） |
| MCP ツール名 | `npm run check:mcp-tool-names` | `mcpToolNames.ts` と `mcp_tool_names.rs` の集合が一致すること |
| 操作の入口表（段階1） | `npm run check:operation-entries` | `operation-entries.md` と `OPERATION_FORMAL` / 右クリック固定 / MCP 名。操作 ID のすべてに右クリック用ラベルがあること（P-CI-06） |
| エージェント向け文書 | `npm run check:agent-docs` | `AGENTS.md`、`docs/agents-*.md`、`.cursor/rules/*.mdc`、各スキルの `SKILL.md` と `references/*.md` の相対リンク（ファイルまたは既存ディレクトリ。`#` アンカーは見ない）。コードフェンス内とインラインの `` `...` `` 内は無視。`[text][ref]` 形式と HTML の `href` は見ない。`SKILL.md` の frontmatter に空でない `name` と `description`。`alwaysApply` ルールと `AGENTS.md` のバイト数を標準出力へ出す |
| 回帰の対応 | `npm run check:regression-coverage` | 全機能の見出し、操作名、MCP ツール名、既存の手動ケースが [regression-matrix.md](regression-matrix.md) と [regression-tc.md](regression-tc.md) の項目と一致すること。注記の一部分では通さない。自動済みのテスト名と、番号付き手順の操作と期待が実在すること。付録 ID の追加と削除は、検査スクリプトの承認済みハッシュを変える。一部自動は計算だけが既存のテストで、残りは自動化予定である。自動化予定と手動のままは合格にしない。振る舞いの正しさは保証しない |
| 循環 import | `npm run check:madge-circular-baseline` | madge とベースライン JSON の一致。**CI frontend で失敗扱い** |
| 重複（警告） | `npm run check:architecture-warn` | jscpd のみ。重複率の上限を超えても CI では失敗にしない。上限は [scripts/check-architecture-warn.mjs](../scripts/check-architecture-warn.mjs) の `--threshold` |
| カバレッジ | `npm run test:coverage` | Vitest coverage。閾値を下回ると CI で失敗する。数値は [vitest.config.ts](../vitest.config.ts) の `coverage.thresholds`。上げ方と緩和時の記載は [開発ガイド](development.md) |
| 型検査 | `npm run typecheck`（`tsc --noEmit`）。`npm run build` は本番ビルドを含む | `src` |
| Clippy | `cd src-tauri && cargo clippy -- -D warnings` | Rust。警告をエラーにする |
| スケジュール検証 | `npm run check:schedule` | 引数なしなら `src/sample/schedule.ts` |
| カレンダー検証 | `npm run check:calendar` | 引数なしなら `examples/jp-2026.calendar.json` |
| メンバー検証 | `npm run check:members` | 引数なしなら `examples/playground.members.json` |
| バージョン | `npm run version:check` | 5ファイルのバージョン番号と `X.Y.Z` / `X.Y.Z-alpha.N` / `X.Y.Z-beta.N` の形、`tauri.conf.json` の `plugins.updater.endpoints` がそのメジャー用 `updater-X` を指すこと |
| スキル同梱物 | `node --test scripts/how-to-citations.test.mjs` のあと `npm run build:validate-skill`、`git status --porcelain` で `how-to/manual/` が空であること、CI と同じパスで `git diff --exit-code` | 生成前の鮮度と引用、スキーマコピー、検証 bundle、`how-to/manual/` の6ファイルの差分 |

Playwright は手動スクリーンショット用に devDependencies にある。画面コンポーネントの単体 DOM テストには jsdom と `@testing-library/react` を使う（`src/**/*.test.tsx`）。ブラウザ回帰の E2E は `npm run test:browser-regression` で実行する（[development.md](development.md)）。

## ブラウザ回帰

`npm run test:browser-regression` で Playwright が `e2e/browser-regression/specs/*.spec.ts` を実行する（`konva-probe.spec.ts` と `manual-screenshot-only.spec.ts` は別プロジェクト）。機能 ID と `test` 名の対応は `e2e/browser-regression/feature-ids.json` を正本とし、下表はその写しである。DOM 回帰の `AppMenu.recent.dom.test.tsx` は [Vitest 表](#vitest) に載せる。

| ファイル | `test` 名 | 機能 ID |
| --- | --- | --- |
| `export-f5.spec.ts` | downloads HTML and SVG of the smoke schedule and opens the HTML | TC-EXPORT-01, RG-F5-1 |
| `export-f5.spec.ts` | exports only the rows left by the name filter, including rows below the viewport | TC-EXPORT-02 |
| `export-f5.spec.ts` | keeps connection arcs and labels out of HTML and SVG downloads | TC-EXPORT-05b |
| `export-f5.spec.ts` | matches exported summary bars, hollow milestones, and hatches to the screen | TC-HIER-07, TC-VIEW-03, TC-VIEW-04b, TC-VIEW-12 |
| `export-f5.spec.ts` | matches sidebar column visibility in the HTML export | TC-EXPORT-05 |
| `export-f5.spec.ts` | shows the Excel desktop-only message in the export dialog | TC-EXPORT-04 |
| `export-f5.spec.ts` | shows todo column off until enabled | TC-EDIT-22b |
| `export-f5.spec.ts` | filters extra fields by type and keeps them out of HTML and SVG exports | TC-EDIT-20f |
| `hierarchy-guides.spec.ts` | aligns hierarchy editor fields and refuses save when a level is added | TC-HIER-06b |
| `hierarchy-guides.spec.ts` | draws a thin summary bar with dotted gaps, solid spans, and downward caps | TC-VIEW-03 |
| `hierarchy-guides.spec.ts` | drops the stem under a collapsed five-level heading and rejoins it when expanded | RG-F10-1 |
| `hierarchy-guides.spec.ts` | keeps guide rail width and name starts aligned on five-level and three-level samples | TC-HIER-04 |
| `hierarchy-guides.spec.ts` | matches sidebar guides and parent bars for two, three, and five levels | TC-HIER-07 |
| `hierarchy-guides.spec.ts` | shows integer rollup percents beside names at the minimum sidebar width | TC-VIEW-03b |
| `hierarchy-guides.spec.ts` | shows level names above the band for two, three, four, and five levels and omits them when the file has no levels | TC-HIER-01 |
| `hierarchy-guides.spec.ts` | shows the outline mismatch and hides add-heading on a short branch and an empty middle branch | TC-HIER-02, TC-HIER-02b |
| `hierarchy-reorder.spec.ts` | adds a heading from the toolbar menu and from the row menu, then undoes | TC-HIER-05e, EDIT-18 |
| `hierarchy-reorder.spec.ts` | collapses and expands from the triangle | VIEW-01, TC-NAV-04, TC-HIER-04 |
| `hierarchy-reorder.spec.ts` | does not select or open a menu from a short grip click | EDIT-13 |
| `hierarchy-reorder.spec.ts` | does not start a reorder while a name filter leaves one row | EDIT-13, TC-EDIT-15c, TC-EDIT-16c, TC-EDIT-17c |
| `hierarchy-reorder.spec.ts` | renames a category and a group from double click and undoes | EDIT-13 |
| `hierarchy-reorder.spec.ts` | reorders a category on the five-level sample from the grip | TC-HIER-04 |
| `hierarchy-reorder.spec.ts` | reorders a task, a category, and a group from the grip and undoes once | EDIT-13 |
| `hierarchy-reorder.spec.ts` | shows one translucent row while a collapsed category or group grip is dragged | EDIT-13, TC-EDIT-16e, TC-EDIT-17e |
| `hierarchy-reorder.spec.ts` | shows the full name on hover... | VIEW-13, TC-NAV-05, TC-EDIT-15b, TC-EDIT-16b, TC-EDIT-17b |
| `konva-probe.spec.ts` | probes Konva readability for regression helpers | — |
| `layout-f2.spec.ts` | compares light and dark screenshots of the sample without judging readability | VIEW-16 (#536) |
| `layout-f2.spec.ts` | folds the shortcut list into one column at 480 by 640 | VIEW-16 |
| `layout-f2.spec.ts` | keeps the corner context menu inside the 480 by 640 window | VIEW-16 |
| `layout-f2.spec.ts` | runs 今日 from the command palette and ignores the palette shortcut while a dialog is open | NAV-07 |
| `layout-f2.spec.ts` | shows only short toolbar labels at 1280 by 800 | VIEW-16 |
| `links-f4.spec.ts` | cancels a link drag onto an earlier task with Escape | RG-F4-2, MX-O-59, MX-O-60 |
| `links-f4.spec.ts` | deletes the hovered connection arc with Delete and restores the label with undo | RG-F4-4, MX-O-89 |
| `links-f4.spec.ts` | deletes the hovered predecessor with Delete and restores it with undo | RG-F4-1, MX-O-87, MX-O-88, MX-H-25 |
| `links-f4.spec.ts` | draws connection arcs without arrowheads and with a different stroke from predecessor links | TC-VIEW-15 |
| `links-f4.spec.ts` | drops only the arc of a deleted endpoint and keeps the other label in the file | TC-VIEW-15c |
| `links-f4.spec.ts` | keeps arcs on broken-only lineage and leaves connection-only rows hidden | TC-EDIT-23c |
| `links-f4.spec.ts` | keeps the arrow head outside the successor bar in week and month | TC-VIEW-08c |
| `links-f4.spec.ts` | marks only broken predecessor links red and removes the arrow when collapsed | TC-VIEW-08 |
| `links-f4.spec.ts` | reddens the predecessor while the end is dragged past the successor, before release | TC-VIEW-08b |
| `links-f4.spec.ts` | shows a filled approval diamond and a hollow tentative diamond | RG-F4-3, MX-O-83, TC-VIEW-04b |
| `manual-screenshot-only.spec.ts` | shows the April 2026 today line when the screenshot clock is 2026-04-15 | NAV-02 |
| `milestone-links.spec.ts` | adds a task in the selected group | EDIT-11 |
| `milestone-links.spec.ts` | adds one link by clicking another bar and leaves the mode with escape | EDIT-23 |
| `milestone-links.spec.ts` | changes confidence and tags from the detail and undoes | EDIT-04 |
| `milestone-links.spec.ts` | deletes a milestone used as a filter and leaves the selection | EDIT-07, FILTER-03 |
| `milestone-links.spec.ts` | does not add a link below the drag thresholds | EDIT-23 |
| `milestone-links.spec.ts` | duplicates from the menu with an empty predecessor and undoes | EDIT-10 |
| `milestone-links.spec.ts` | edits a milestone from the name menu and undoes | MX-O-84 |
| `milestone-links.spec.ts` | edits the title with enter, tab, and escape, and ignores composing keys as a stand-in | EDIT-03 |
| `milestone-links.spec.ts` | enters link mode from the button and ctrl or meta L, not from L alone | EDIT-23 |
| `milestone-links.spec.ts` | moves the milestone focus with escape without closing the detail | VIEW-04c |
| `milestone-links.spec.ts` | opens the note from the icon and from the menu | VIEW-11 |
| `milestone-links.spec.ts` | refuses a self predecessor and a cycle from the detail | EDIT-04 |
| `milestone-links.spec.ts` | replaces assignees from the detail and the bulk panel and undoes | EDIT-04s |
| `milestone-links.spec.ts` | toggles task confidence from the menu and undoes | EDIT-04 |
| `normal-clock.spec.ts` | does not install the screenshot clock in the normal browser | SYNC-01 |
| `settings-catalog.spec.ts` | adds a custom list without a dialog | TC-SET-08k |
| `settings-catalog.spec.ts` | adds a status, colors the bar, and keeps the description after reload | TC-SET-08d |
| `settings-catalog.spec.ts` | adds two new extensions with one field each and can return to the previous radio | TC-SET-10h |
| `settings-catalog.spec.ts` | aligns month-day, duration, percent, status, overrun, and assignee columns | TC-SET-01c |
| `settings-catalog.spec.ts` | downloads the renamed extension and shows the new id in settings | TC-SET-10i |
| `settings-catalog.spec.ts` | grays a non-working weekday and restores weekends after the calendar is removed | TC-SET-03, TC-SET-03b |
| `settings-catalog.spec.ts` | hides the member description on the list, the detail, and the chart | TC-SET-02o |
| `settings-catalog.spec.ts` | keeps 200 percent and auto after reload | TC-SET-01 |
| `settings-catalog.spec.ts` | keeps a description, drops a blank instruction, and keeps the footer inside a narrow overlay | TC-SET-08o |
| `settings-catalog.spec.ts` | keeps extension definitions after reload and leaves schedule field values unsaved | TC-SET-10c |
| `settings-catalog.spec.ts` | keeps one close button and the footer inside a viewport under 900 pixels | TC-SET-10g |
| `settings-catalog.spec.ts` | keeps settings rows inside the dialog at 50 and 200 percent in light and dark | TC-SET-07c |
| `settings-catalog.spec.ts` | keeps the assignee id and shows the unknown member after the person is deleted | TC-SET-02n |
| `settings-catalog.spec.ts` | leaves chart assignee text unchanged when an unused catalog is renamed | TC-SET-02j |
| `settings-catalog.spec.ts` | leaves the active catalog unchanged when a new catalog is created | TC-SET-02k |
| `settings-catalog.spec.ts` | leaves the active catalog unchanged when JSON is downloaded | TC-SET-02l |
| `settings-catalog.spec.ts` | opens a one-item color draft and leaves the active list unchanged | TC-SET-09e |
| `settings-catalog.spec.ts` | reorders statuses, downloads JSON that passes check:statuses, and leaves the active list unchanged when copied | TC-SET-08f |
| `settings-catalog.spec.ts` | shows catalog status colors, overdue borders, and lightning folds on the bars | TC-SET-08, TC-SET-08b, TC-SET-08c, TC-SET-08g |
| `settings-catalog.spec.ts` | shows the color field on detail, bulk, and duplicate, and separates leave-unchanged from none | TC-SET-09 |
| `settings-catalog.spec.ts` | steps the display scale from the shortcut without zooming the page | TC-SET-01b |
| `settings-diff.spec.ts` | adds a color list and refuses a blank or duplicate id | TC-SET-09h |
| `settings-diff.spec.ts` | clicks a diff row without changing a multi-selection | FILE-07 |
| `settings-diff.spec.ts` | closes the field overlay with escape | SET-10 |
| `settings-diff.spec.ts` | collapses back to the handle and copies with the shortcut without opening the column | TC-FILE-07p |
| `settings-diff.spec.ts` | discards or keeps a status draft and removes a catalog from the overlay | SET-08 |
| `settings-diff.spec.ts` | keeps the chart width as the remainder beside the detail and the diff column | TC-FILE-07r, RG-F11-2 |
| `settings-diff.spec.ts` | keeps the connection dialog open until both fields are filled | TC-EDIT-23 |
| `settings-diff.spec.ts` | leaves the chart still and shows the band-off message | TC-FILE-07y |
| `settings-diff.spec.ts` | leaves the chart still and shows the filter-hidden message | TC-FILE-07x |
| `settings-diff.spec.ts` | opens the diff from the right-edge handle and shows the old and new end | TC-FILE-07, RG-F11-1 |
| `settings-diff.spec.ts` | opens the diff handle after removing one connection | TC-FILE-07z, EDIT-23 |
| `settings-diff.spec.ts` | places the copy notice off the diff column and scrolls only the list at height 800 | TC-FILE-07b, RG-F11-4 |
| `settings-diff.spec.ts` | saves a member display name from the overlay and leaves an unused catalog unchanged | TC-SET-02c |
| `settings-diff.spec.ts` | scrolls only the list under the diff heading | TC-FILE-07q |
| `settings-diff.spec.ts` | scrolls to the parent row and marks it when a deleted task row is pressed | TC-FILE-07w |
| `settings-diff.spec.ts` | shows no difference after save and turns the empty column into a body when edited | TC-FILE-07c, TC-FILE-07m |
| `smoke-edit-drag.spec.ts` | clears the selection when the filter changes | TC-EDIT-01b |
| `smoke-edit-drag.spec.ts` | commits a drag that starts as a right click and undoes it once | EDIT-02, EDIT-11 |
| `smoke-edit-drag.spec.ts` | does not change horizontal scroll when a visible bar is clicked | NAV-01 |
| `smoke-edit-drag.spec.ts` | does not focus the detail name when the period edge is clicked | EDIT-03 |
| `smoke-edit-drag.spec.ts` | drags one bar across a non-working day without showing 休 | VIEW-09 |
| `smoke-edit-drag.spec.ts` | extends the selection with shift and arrow keys | EDIT-10 |
| `smoke-edit-drag.spec.ts` | keeps the empty group 後半 when delete is cancelled | EDIT-12 |
| `smoke-edit-drag.spec.ts` | keeps 設計 selected when the handle or its inside edge is right-clicked | EDIT-02 |
| `smoke-edit-drag.spec.ts` | keeps 調査 when delete is cancelled | EDIT-10 |
| `smoke-edit-drag.spec.ts` | selects by click, shift range, and ctrl or meta toggle | EDIT-10 |
| `smoke-edit-drag.spec.ts` | shows month day chips mid drag without overlapping the bar (EDIT-02b) | TC-EDIT-02b |
| `smoke-edit-drag.spec.ts` | shows only add-milestone on an empty chart right click | EDIT-07 |
| `smoke-edit-drag.spec.ts` | shows only delete after shift-clicking 調査 and 設計 | EDIT-10 |
| `smoke-nav-scroll.spec.ts` | drags the sidebar boundary and keeps the row and bar on the same y | TC-NAV-06 |
| `smoke-nav-scroll.spec.ts` | keeps sticky headings in sync... | TC-NAV-01f |
| `smoke-nav-scroll.spec.ts` | scrolls the long list until row 40... | NAV-01 |
| `smoke-nav-scroll.spec.ts` | scrolls the sidebar horizontally with the wheel and zooms there | NAV-01 |
| `smoke-nav-scroll.spec.ts` | scrolls with ctrl or meta and the arrow keys... | NAV-01 |
| `smoke-nav-scroll.spec.ts` | shifts the chart horizontally with shift and the wheel | NAV-01 |
| `smoke-view-nav.spec.ts` | leaves 設計 unchanged when escape is pressed before release (EDIT-02) | EDIT-02 |
| `smoke-view-nav.spec.ts` | moves 設計 to 2026-04-06 through 2026-04-10 on release and adds one undo (EDIT-02) | EDIT-02 |
| `smoke-view-nav.spec.ts` | pans the empty chart 80px without moving the list vertically (NAV-01) | NAV-01 |
| `smoke-view-nav.spec.ts` | sets day week and month widths to 40 22 and 8 and fits (NAV-02, NAV-03) | NAV-02, NAV-03 |
| `smoke-view-nav.spec.ts` | shows the smoke fixture title and task names (VIEW-01) | VIEW-01 |
| `view-appearance.spec.ts` | adds no task on cancel or Escape and keeps the dialog open when the end is before the start | TC-EDIT-14b |
| `view-appearance.spec.ts` | asks to narrow the predecessor search when there are more than 50 tasks | TC-EDIT-05b |
| `view-appearance.spec.ts` | clears tag selection when a task is added under a tag filter | TC-EDIT-08d |
| `view-appearance.spec.ts` | relaxes a done status filter when a task is added and selects the new row | TC-EDIT-08 |
| `view-appearance.spec.ts` | closes only the predecessor list on Escape and leaves the detail open | TC-EDIT-05d |
| `view-appearance.spec.ts` | does not reorder a filtered task, category, or group from the grip | TC-EDIT-15c, TC-EDIT-16c, TC-EDIT-17c |
| `view-appearance.spec.ts` | drags the sidebar boundary, restores it on double click, and shrinks only the applied width | TC-NAV-06 |
| `view-appearance.spec.ts` | fills in-progress bars with a darker progress segment, done in green, and not-started in gray | TC-VIEW-02 |
| `view-appearance.spec.ts` | hides the extra-fields section on the startup sample | TC-EDIT-04l |
| `view-appearance.spec.ts` | keeps the confirmation calendar inside the viewport | TC-EDIT-04o |
| `view-appearance.spec.ts` | leaves unknown color ids and catalog-only risk unpainted, and hides the color field on the startup sample | TC-VIEW-14 |
| `view-appearance.spec.ts` | matches overdue borders, overrun frames, and lightning folds to isOverdue and lightningDate for the page today | TC-VIEW-05, TC-VIEW-06, TC-VIEW-07 |
| `view-appearance.spec.ts` | matches score and progress field widths to the note and shows a percent sign | TC-EDIT-04n |
| `view-appearance.spec.ts` | meets a 4.5 to 1 contrast for extra-field text and the percent sign in light and dark | TC-EDIT-04r |
| `view-appearance.spec.ts` | omits the task itself from predecessor options | TC-EDIT-05 |
| `view-appearance.spec.ts` | removes the survey on redo and restores it again on undo, with the selection still empty | RG-S3-11 |
| `view-appearance.spec.ts` | removes the task and the predecessor line after the delete is confirmed | TC-EDIT-09 |
| `view-appearance.spec.ts` | restores the survey note and the design link after delete and undo, and leaves the selection empty | RG-S3-10 |
| `view-appearance.spec.ts` | scrolls milestone names to the right edge, ellipsizes past 24 characters, and shows the full name on hover | TC-VIEW-04 |
| `view-appearance.spec.ts` | scrolls the highlighted milestone into view and leaves the value unchanged on Enter | TC-EDIT-04i |
| `view-appearance.spec.ts` | selects from the bar and the row and clears on the background | TC-EDIT-01 |
| `view-appearance.spec.ts` | shows tentative hatch, committed solid bar, and no 未確定 in the task list | TC-VIEW-12 |
| `view-appearance.spec.ts` | shows the full name on hover and does not drag the name, then reorders from the grip | TC-NAV-05, TC-EDIT-15b, TC-EDIT-16b, TC-EDIT-17b |
| `view-appearance.spec.ts` | shows the full task name, ellipsizes the hierarchy line, and shows the full path on hover | TC-EDIT-05c |
| `view-appearance.spec.ts` | shows unassigned, known, and unknown assignee chips on the list and in the HTML and SVG download | TC-VIEW-10 |
| `view-appearance.spec.ts` | ties todo checks to progress, hides checks under the row, and omits todos from HTML and SVG | TC-EDIT-22 |

## CI での実行

| ワークフロー | きっかけ | 実行するもの |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `develop`、`main`、`next` 向けの pull request | 変更パスがフロントなら `version:check`、`build`、`lint`、`check:mcp-tool-names`、`check:operation-entries`、`check:regression-coverage`、`check:madge-circular-baseline`（循環 import）、`test:ci`（閾値未満は失敗）、`check:architecture-warn`（jscpd。上限超過は警告）、`check:schedule`、`check:calendar`、`check:members`、`node --test scripts/how-to-citations.test.mjs`（生成前）、`build:validate-skill`、`git status --porcelain` で `how-to/manual/` が空であること、`npm audit --audit-level=high`、スキル同梱物と `how-to/manual/` の差分。Rust なら `npm ci` のあと `version:check`、Ubuntu と Windows で Clippy と `cargo test --locked`。操作マニュアルのサイト入力なら `npm ci` のあと `build:manual-site`、`node --test scripts/how-to-citations.test.mjs`（生成前）、`build:validate-skill`、`git status --porcelain` で `how-to/manual/` が空であること、マニュアル6ファイルと `how-to/manual/` の差分。エージェント向け文書だけ（フロント・Rust・`manual` と重ならないパス）なら `npm run check:agent-docs` と `node --test scripts/check-agent-docs.test.mjs`。最後に集約ジョブ `ci` が成功する |
| `.github/workflows/pages.yml` | `main` への push（操作マニュアルとサイトビルドの入力）または `workflow_dispatch` | `npm ci` のあと `build:manual-site` を GitHub Pages へ公開する |
| `.github/workflows/release.yml` | `main` または `release/**` への push | 版、ブランチ、タグの検査のあと、環境 `release` の承認のあと、更新用署名付きの Ubuntu deb と Apple Silicon の dmg を GitHub Release へ出す。安定版では Windows が署名しない MSIX を Microsoft Store（`9PP41TRJ8ZT8`）へ提出する。Pre-release では Windows NSIS と `schedule-viewer-codesign.cer` と `latest-windows-x86_64.json` を出す。`latest-linux-x86_64.json`、`latest-darwin-aarch64.json` と、安定版では `linux-x86_64` と `darwin-aarch64` の `latest.json`、Pre-release では `windows-x86_64` も含む `latest.json`、`SHA256SUMS` を載せる。Pre-release では Latest を付けず `updater-X` も更新しない。安定版の `checksums` は deb と dmg の成功を待ち、Store 提出の成否では止まらない。`main` は安定版で CHANGELOG から本文を組み立てる。安定版ではビルド前に GitHub Release を作り、`checksums` が `updater-X` を更新し、より大きいメジャーが無いときだけ Latest を付ける。`release/X.Y.Z` は Pre-release で、アルファまたはベータに応じた短い確認用の本文 |

`develop` への push だけでは CI は動かない。`docs/*.md` だけの変更（操作マニュアル以外）ではフロントと Rust と `manual` はスキップするが、集約ジョブ `ci` は成功する。`agentdocs` ジョブは `npm run check:agent-docs` と `node --test scripts/check-agent-docs.test.mjs` を走らせる。**agentdocs だけ**が立つのは、変更がフロント・Rust・`manual` に当たらないときである。`.cursor/skills/write-*` と `how-to/` の SKILL・`references` は frontend と重なり、`.cursor/skills/schedule-talk/` の SKILL・`references` は Rust と重なる。詳細は [開発ガイド](development.md#ブランチと-ci) にある。

## 自動テスト一覧

### node:test

| ファイル | ケース | 機能 ID |
| --- | --- | --- |
| `scripts/build-user-manual-site.test.mjs` | 同じページ内の `#見出し` は、その HTML の見出し id と照合する。無いときは HTML ファイル名を出して失敗する | — |
| `scripts/how-to-citations.test.mjs` | `how-to manual bundle matches stripped sources and exact six files` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `assertHowToManualBundleState rejects missing file` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `assertHowToManualBundleState rejects extra file` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `assertHowToManualBundleState rejects extra directory` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `assertHowToManualBundleState rejects stale content` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `assertHowToManualBundleState rejects leftover image tokens` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `strip removes image tokens from features sample` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `declared citations in SKILL and questions use known manual slugs`（`SKILL.md` と `docs/how-to-questions.md` に書いた引用だけ。LLM の返答は対象外） | SET-05 |
| `scripts/how-to-citations.test.mjs` | `docs how-to-questions has eight fixed question headings` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `features.md#設定 is a valid citation` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `features.md#この見出しは無い is rejected` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `features.md heading ファイルを開く・保存する uses slug ファイルを開く保存する` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `duplicate manual headings use github-slugger -1 suffix` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `slash-qualified citation manual/features.md#設定 is rejected` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `unknown file bogus.md#foo is rejected` | SET-05 |
| `scripts/how-to-citations.test.mjs` | `extractFileHeadingCitations finds citations in markdown` | SET-05 |
| `scripts/check-madge-circular-baseline.test.mjs` | `check-madge-circular-baseline matches madge-circular-baseline.json` | — |
| `scripts/check-operation-entries.test.mjs` | `check-operation-entries matches labels and MCP names in operation-entries.md` | — |
| `scripts/check-consult-lazy-loading.test.mjs` | `stub must reject every relocated session body heading` | — |
| `scripts/check-consult-lazy-loading.test.mjs` | `check-consult-lazy-loading structural guard` | — |
| `scripts/format-check-record.test.mjs` | `shaIdentity valid when full SHAs match` | — |
| `scripts/format-check-record.test.mjs` | `shaIdentity stale when full SHAs differ` | — |
| `scripts/format-check-record.test.mjs` | `shaIdentity invalid when SHA missing or malformed` | — |
| `scripts/format-check-record.test.mjs` | `missing command output yields unknown metrics not zero` | — |
| `scripts/format-check-record.test.mjs` | `parseLintWarningCount from synthetic eslint fixture` | — |
| `scripts/format-check-record.test.mjs` | `parseCoverageLinesPercent from synthetic vitest text-summary fixture` | — |
| `scripts/format-check-record.test.mjs` | `parseCoverageLinesPercent prefers global summary over scoped threshold errors` | — |
| `scripts/format-check-record.test.mjs` | `parseMadgeCycleCount from synthetic madge OK fixture` | — |
| `scripts/format-check-record.test.mjs` | `parseJscpdDuplicatedLinesPercent from synthetic jscpd ERROR over threshold` | — |
| `scripts/format-check-record.test.mjs` | `parseJscpdDuplicatedLinesPercent from synthetic jscpd silent detection line` | — |
| `scripts/format-check-record.test.mjs` | `parseJscpdDuplicatedLinesPercent without detection percent stays unknown` | — |
| `scripts/format-check-record.test.mjs` | `parseJscpdDuplicatedLinesPercent from synthetic jscpd total row` | — |
| `scripts/format-check-record.test.mjs` | `collectMetrics maps synthetic fixtures to command rows` | — |
| `scripts/format-check-record.test.mjs` | `nonzero command exit marks failed aggregate status` | — |
| `scripts/format-check-record.test.mjs` | `failed or missing command exit makes usableForGuideline false despite valid sha` | — |
| `scripts/format-check-record.test.mjs` | `durationMs provenance is provided only when caller supplied a number` | — |
| `scripts/format-check-record.test.mjs` | `record limits state shaIdentity is not execution proof` | — |
| `scripts/format-check-record.test.mjs` | `phase log migration preserves #551 and #475 structured history` | — |
| `scripts/format-check-record.test.mjs` | `phase log validator allows future numeric token fields` | — |
| `scripts/format-check-record.test.mjs` | `phase log validator rejects #475 plan effort not high` | — |
| `scripts/format-check-record.test.mjs` | `phase log validator rejects #475 review effort not high` | — |
| `scripts/format-check-record.test.mjs` | `phase log validator rejects #475 implement effort not unknown` | — |
| `scripts/format-check-record.test.mjs` | `phase log validator rejects #475 fix composer effort not unknown` | — |
| `scripts/format-check-record.test.mjs` | `phase log validator rejects fabricated old table March migration phrase` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecord rejects high effort without effort_basis` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecord accepts configured high plan with effort_basis configured` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecord rejects fix_rounds mismatch` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision rejects dropped earlier phase` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision allows appended correction and integration status change` | — |
| `scripts/format-check-record.test.mjs` | `#591 record uses as-of integration_status without validator pinning open forever` | — |
| `scripts/format-check-record.test.mjs` | `committed #592 canonical record matches high plan configured and fix_rounds 1` | — |
| `scripts/format-check-record.test.mjs` | `phase log practice entries link canonical #591 and #592 records` | — |
| `scripts/format-check-record.test.mjs` | `#591 committed record reflects GitHub user merge and keeps verified_head_sha` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision accepts #591 user merge phase and merged integration_status` | — |
| `scripts/format-check-record.test.mjs` | `#591 committed record verified_head_sha matches latest MERGE-READY review` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecord rejects verified_head_sha missing when MERGE-READY review exists` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision rejects mutated committed #591 phase prefix` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision rejects replaced committed #591 correction prefix` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision rejects reordered committed #591 phases` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision rejects deleted committed #591 correction` | — |
| `scripts/format-check-record.test.mjs` | `validatePhaseRecordRevision accepts appended phase on committed #591 record` | — |
| `scripts/format-check-record.test.mjs` | `shaIdentityStatus unit cases` | — |
| `scripts/check-review-agent-frontmatter.test.mjs` | `review-behavior agent frontmatter name model readonly` | — |
| `scripts/check-review-agent-frontmatter.test.mjs` | `review-behavior agent explicit invocation and review-implementation link` | — |
| `scripts/check-agent-docs.test.mjs` | `stripFencedCodeBlocks removes fenced links` | — |
| `scripts/check-agent-docs.test.mjs` | `resolveRelativeFileLink rejects broken relative link` | — |
| `scripts/check-agent-docs.test.mjs` | `validateSkillFrontmatter rejects missing description` | — |
| `scripts/check-agent-docs.test.mjs` | `valid relative links and frontmatter pass in fixture tree` | — |
| `scripts/check-agent-docs.test.mjs` | `check-agent-docs passes on repository agent-doc tree` | — |
| `scripts/check-agent-docs.test.mjs` | `resolveRelativeFileLink accepts external URL without file check` | — |
| `scripts/check-agent-docs.test.mjs` | `resolveRelativeFileLink accepts existing directory target` | — |
| `scripts/check-agent-docs.test.mjs` | `inline backtick link is ignored after fence strip` | — |
| `scripts/check-agent-docs.test.mjs` | `unquoted broken prose link still fails` | — |
| `scripts/check-agent-docs.test.mjs` | `validateSkillFrontmatter rejects empty quoted description` | — |
| `scripts/block-history-rewrite.test.mjs` | `allows ordinary status commit push and merge` | — |
| `scripts/block-history-rewrite.test.mjs` | `denies commit amend through global options and wrappers` | — |
| `scripts/block-history-rewrite.test.mjs` | `denies force push flags short clusters and plus refspecs` | — |
| `scripts/block-history-rewrite.test.mjs` | `denies rebase and pull rebase but allows rebase false` | — |
| `scripts/block-history-rewrite.test.mjs` | `allows quoted text that mentions forbidden words` | — |
| `scripts/block-history-rewrite.test.mjs` | `denies a forbidden command after a chain operator` | — |
| `scripts/block-history-rewrite.test.mjs` | `malformed hook input denies with json` | — |
| `scripts/block-history-rewrite.test.mjs` | `stdin fixtures do not execute the command` | — |
| `scripts/block-history-rewrite.test.mjs` | `sandbox and confirmation words do not allow a rewrite` | — |
| `scripts/block-history-rewrite.test.mjs` | `substitution with rewrite is denied` | — |
| `scripts/block-history-rewrite.test.mjs` | `unbalanced double quotes deny` | — |
| `scripts/block-history-rewrite.test.mjs` | `empty command is allowed` | — |
| `scripts/block-history-rewrite.test.mjs` | `denies substitutions inside double quotes and commit -m with them` | — |
| `scripts/block-history-rewrite.test.mjs` | `backslash outside quotes preserves argv boundaries for amend` | — |
| `scripts/block-history-rewrite.test.mjs` | `pull rebase flag order terminator and qr cluster` | — |
| `scripts/block-history-rewrite.test.mjs` | `git globals support documented options and deny unknown globals` | — |
| `scripts/block-history-rewrite.test.mjs` | `shell dash c skips long rcfile options` | — |
| `scripts/block-history-rewrite.test.mjs` | `env command exec wrappers peel to git` | — |
| `scripts/block-history-rewrite.test.mjs` | `push force policy push options and no force independence` | — |
| `scripts/block-history-rewrite.test.mjs` | `trailing shell comments do not hide git verbs` | — |
| `scripts/block-history-rewrite.test.mjs` | `pull rebase from git config global only with explicit override` | — |
| `scripts/block-history-rewrite.test.mjs` | `simple grouped commands still classify git` | — |
| `scripts/block-history-rewrite.test.mjs` | `hooks.json registers beforeShellExecution block-history-rewrite` | — |
| `scripts/block-history-rewrite.test.mjs` | `env peeled through assignments chdir and double hyphen` | — |
| `scripts/block-history-rewrite.test.mjs` | `git informational globals without subcommand allow` | — |
| `scripts/check-implement-change-split.test.mjs` | `implement-change references are scanned by the agent-doc checker` | — |
| `scripts/check-implement-change-split.test.mjs` | `reference files do not require skill frontmatter` | — |
| `scripts/check-implement-change-split.test.mjs` | `entry keeps before-start and completion and omits moved headings` | — |
| `scripts/check-implement-change-split.test.mjs` | `moved sections keep clause numbers once` | — |
| `scripts/check-quality-doc-sources.test.mjs` | `development quality table links sources and omits mutable limits` | — |
| `scripts/check-quality-doc-sources.test.mjs` | `copied limit guard tolerates Issue #436 in scoped jscpd cell` | — |
| `scripts/check-quality-doc-sources.test.mjs` | `agent-facing quality pointers reference config sources` | — |
| `scripts/check-quality-doc-sources.test.mjs` | `recurrence instructions require checks before skill prose in four sources` | — |
| `scripts/check-quality-doc-sources.test.mjs` | `recurrence mutation fixtures reject prose-only regressions` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci.yml changes job pipes git diff into ci-changed-path-flags.sh` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: build-user-manual-site.mjs is manual only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: manual-site render.mjs is manual only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: ci.yml is frontend and rust` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: pages.yml is frontend and rust` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: docs agents non-md still sets agentdocs only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: rules non-mdc still sets agentdocs only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: check-agent-docs files are agentdocs only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: ci-changed-path-flags files are frontend only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: write-schedule SKILL is frontend and agentdocs` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: schedule-talk reference is rust and agentdocs` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: src App is frontend only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: src-tauri lib is rust only` | — |
| `scripts/ci-changed-path-flags.test.mjs` | `ci workflow script: consult rule and session are agentdocs only` | — |

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
| 同上 | `TC-EDIT-04u: resolves workspace-only ids for sidebar, detail, bulk, and duplicate labels` | EDIT-04, FILE-10 |
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
| `baselineDiffsConnections.test.ts` | `classifies screen-only removal as 画面のみ` / `mergeBaselineConnections` の片側削除と両側追加 | SYNC-01, FILE-07 |
| `diffNavigation.test.ts` | `reveals the earlier task for connection diff rows` | FILE-07 |
| `dependencies.test.ts` | `includes connection partner reachable through dependencies` | FILTER-08 |
| 同上 | `approaches from the left when the gap is shorter than the arrow` | VIEW-08 |
| 同上 | `routes around a bar that starts before the predecessor ends` | VIEW-08 |
| `connections.test.ts` | `accepts sample schedule without connections` | VIEW-15 |
| 同上 | `accepts connections example schedule` | VIEW-15 |
| 同上 | `rejects duplicate pairs regardless of order` | VIEW-15 |
| 同上 | `routes above an obstacle bar between rows` | VIEW-15 |
| 同上 | `keeps default position when nothing overlaps` | VIEW-15 |
| 同上 | `shifts up when default overlaps` | VIEW-15 |
| 同上 | `shifts left when default and up overlap` | VIEW-15 |
| 同上 | `shifts right when other candidates overlap` | VIEW-15 |
| 同上 | `keeps default when all four candidates overlap` | VIEW-15 |
| 同上 | `skips up candidate above chart body top` | VIEW-15 |
| 同上 | `later labels avoid earlier connection labels` | VIEW-15 |
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
| `excelConnectionCurve.test.ts` | `includes a visible connection curve` | EXPORT-05 |
| 同上 | `omits a connection when one task is hidden` | EXPORT-05 |
| 同上 | `uses light arc color when the app is dark` | EXPORT-05 |
| 同上 | `includes the connection label` | EXPORT-05 |
| 同上 | `uses light label color when the app is dark` | EXPORT-05 |
| `excelLightning.test.ts` | `returns null when the lightning line is off` | EXPORT-05 |
| 同上 | `returns null when today is outside the timeline` | EXPORT-05 |
| 同上 | `returns null when there are no body rows` | EXPORT-05 |
| 同上 | `places today line on the today column with lightning color` | EXPORT-05 |
| 同上 | `scales height with body row count and row height only` | EXPORT-05 |
| `excelLayout.test.ts` | `uses 28px header when date columns are 96px or wider` | EXPORT-05 |
| 同上 | `uses 22px header when date columns are narrower than 96px` | EXPORT-05 |
| `excelMilestone.test.ts` | `puts group name and diamond column`、`uses hollow prefix for tentative milestones`、`joins mixed confidence on the same day` | EXPORT-05 |
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
| 同上 | `puts connection curves into the payload` | EXPORT-05 |
| 同上 | `leaves dependency connectors unchanged when a connection is present` | EXPORT-05 |
| 同上 | `counts connection labels toward the drawing limit` | EXPORT-05 |
| `excelExportColumns.test.ts` | `uses default columns when storage is empty` | EXPORT-01, EXPORT-05 |
| 同上 | `parses stored preferences` | EXPORT-01, EXPORT-05 |
| 同上 | `defaults field columns to off`、`inserts enabled field columns before note`、`disambiguates duplicate names only among enabled field columns` | EXPORT-01, EXPORT-05 |
| `exportExcel.test.ts` | `leaves field columns off by default`、`formats enabled field columns before note` | EXPORT-05 |
| `exportExcel.test.ts` | `refuses export when visible rows exceed 10000` | TC-EXPORT-03 |
| `exportExcel.test.ts` | `puts the smoke task name, start date, and Japanese text in the excel payload` | RG-F5-2 |
| `exportHtml.test.ts` | `refuses export when visible rows exceed 10000` | TC-EXPORT-03 |
| 同上 | `puts full assignee text in one column for tasks and leaves headings empty` | EXPORT-05 |
| 同上 | `does not add assignee cells on milestone rows when the column is on` | EXPORT-05 |
| `baselineDiffs.test.ts` | `classifies same key with number on screen and string on file as 異なる`、`keeps unchanged field values when merging a file-only field change` | SYNC-01, FILE-07 |
| `baselineMergeReview.test.ts` | `orders extension fields by definition in change blocks`、`orders extension fields by definition under conflict headlines` | SYNC-01, FILE-07 |
| `exportHtml.test.ts` | `puts the active filter into HTML and SVG`、`omits fieldValues from HTML and SVG export` | EXPORT-01, EXPORT-02 |
| 同上 | `escapes font-family in SVG attributes but not in HTML CSS` | EXPORT-01 |
| 同上 | `omits overlapping month header labels in month export but keeps grid lines` | NAV-02, EXPORT-02 |
| 同上 | `hatches tentative bars and labels them, and leaves committed bars solid` | VIEW-12, EXPORT-01 |
| 同上 | `renders a hollow tentative milestone and a solid committed one` | VIEW-04, VIEW-12, EXPORT-01 |
| 同上 | `draws guide lines only for milestones in milestoneGuideLineIds` | VIEW-04, EXPORT-02 |
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
| `screenContext.test.ts` | `puts the catalog first, once, with status bar colors` | MCP-01 |
| 同上 | `names the status filter from the catalog` | MCP-01 |
| 同上 | `starts the filtered tasks payload with the catalog` | MCP-01 |
| `mcpScreenBridgeSnap.test.ts` | `maps bridge viewport fields to McpViewportForReadTools names` | MCP-01 |
| 同上 | `picks view fields required for read tools` | MCP-01 |
| 同上 | `uses live chart anchors when provided for overlay build` | MCP-01 |
| 同上 | `includes collapsed viewport and overlay build in read payload fields` | MCP-01 |
| `memberAppData.test.ts` | `drops a leading BOM and leaves other text unchanged` | SET-02 |
| 同上 | `stores imported JSON without a BOM and reads it back` | SET-02 |
| 同上 | `imports the sample only once when two seeds overlap` | SET-02 |
| 同上 | `turns a storage failure into a user-facing error` | SET-02 |
| 同上 | `does not restore a sample catalog after it was removed` | SET-02 |
| 同上 | `returns null when browser storage holds an empty body` | SET-02 |
| `catalogAppDataLoader.test.ts` | `exposes C0-pinned catalog import error strings` | SET-02, SET-08, SET-09 |
| 同上 | `defaults catalog id from filename` | SET-02 |
| 同上 | `treats empty browser catalog body as missing` | SET-02, SET-08, SET-09 |
| `catalogEditorCopy.test.ts` | `builds member applied notes for app modes` | SET-02 |
| 同上 | `adds dirty and in-use lines to remove confirm` | SET-08 |
| 同上 | `uses status workspace subtitle with file label` | SET-08 |
| 同上 | `formats save messages` | SET-02, SET-08, SET-09 |
| 同上 | `pins color radio group name` | SET-09 |
| `catalogEditorUi.test.ts` | `allows workspace edit only for __workspace__ id` | SET-02, SET-08, SET-09 |
| 同上 | `routes overlay keys through confirm, undo, close, and tab` | SET-02, SET-08, SET-09 |
| 同上 | `computes scroll reveal delta` | SET-02, SET-08, SET-09 |
| 同上 | `tracks member session-new rows` | SET-02 |
| 同上 | `disables delete for keep-last policy` | SET-08, SET-09 |
| 同上 | `suggests export names` | SET-02, SET-08, SET-09 |
| 同上 | `shrinks selection index when list shortens` | SET-02, SET-08, SET-09 |
| `catalogEditorOverlay.ui.test.ts` | `keeps shared overlay shell classes and dialog roles` | SET-02, SET-08, SET-09 |
| 同上 | `pins member-specific copy via catalogEditorCopy` | SET-02 |
| 同上 | `pins status-specific copy` | SET-08 |
| 同上 | `pins color-specific copy` | SET-09 |
| 同上 | `keeps thin member overlay wrapper wiring` | SET-02 |
| 同上 | `exposes shared footer button labels` | SET-02, SET-08, SET-09 |
| 同上 | `keeps member panel list hint in member panel source` | SET-02 |
| `catalogEditorOverlay.dom.test.tsx` | `shows member catalog title and picker actions` | SET-02 |
| 同上 | `shows status catalog title and picker actions` | SET-08 |
| 同上 | `shows color catalog title and picker actions` | SET-09 |
| 同上 | `shows member-specific applied note when chart uses this catalog` | SET-02 |
| 同上 | `shows status remove-in-use warning in confirm dialog` | SET-08 |
| 同上 | `shows copy confirm body for color catalog` | SET-09 |
| 同上 | `marks the main panel inert while discard confirm is open` | SET-02, SET-08, SET-09 |
| 同上 | `focuses discard confirm on open` | SET-02, SET-08, SET-09 |
| 同上 | `Escape on discard confirm calls cancel handler` | SET-02, SET-08, SET-09 |
| 同上 | `Tab wraps focus from panel end to start` | SET-02, SET-08, SET-09 |
| `settingsCatalogSectionCopy.test.ts` | `pins member overwrite confirm after the catalog list` | SET-02 |
| 同上 | `pins color and status overwrite confirm before the catalog list` | SET-08, SET-09 |
| 同上 | `uses distinct empty-list and failure strings per kind` | SET-02, SET-08, SET-09 |
| 同上 | `pins status confirm copy to match color placement and labels` | SET-08, SET-09 |
| `settingsCatalogIo.dom.test.tsx` | `TC-SET-02: import shows catalog name, resolves assignee id, and leaves schedule JSON unchanged` | SET-02 |
| 同上 | `TC-SET-02: import accepts description on members` | SET-02 |
| 同上 | `TC-SET-02: import rejects blank member name` | SET-02 |
| `settingsCatalogSection.dom.test.tsx` | `renders color note actions and catalog row labels` | SET-09 |
| 同上 | `shows color overwrite dialog before list with aria-label` | SET-09 |
| 同上 | `shows member overwrite dialog after clear selection and list` | SET-02 |
| 同上 | `shows status overwrite dialog before list like color` | SET-08 |
| 同上 | `hides member clear selection when nothing is selected` | SET-02 |
| 同上 | `disables color clear selection when no catalog is selected` | SET-09 |
| 同上 | `wires member section to member copy and note` | SET-02 |
| 同上 | `wires color section to color note with colorId` | SET-09 |
| 同上 | `wires status section to built-in fallback label` | SET-08 |
| `settingsHierarchyDiff.dom.test.tsx` | `shows assignee, status, color name, and extension memo from the selected catalogs` | SET-02, SET-08, SET-09, EDIT-04 |
| `AppMenu.recent.dom.test.tsx` | `lists schedule and workspace recent files, shows the path on hover, and clears history` | MX-O-75, MX-O-86 |
| 同上 | `keeps a disabled recent-files row when the list is empty` | MX-O-75 |
| 同上 | `registers macOS file save on the same action as the app menu` | MX-O-4 |
| 同上 | `opens the first recent schedule when chosen from the submenu` | MX-O-4 |
| 同上 | `keeps the member editor open and shows the saved display name on the rows` | SET-02 |
| 同上 | `keeps the status editor open and shows the saved status name` | SET-08 |
| 同上 | `keeps the row fill bound to the renamed color` | SET-09 |
| 同上 | `closes catalog editors on external reload and leaves the draft out of storage` | SET-02, SET-08, SET-09, SYNC-01 |
| 同上 | `hides the member editor when workspace members cannot be read` | SET-02 |
| 同上 | `TC-EDIT-04u: shows workspace-only assignee in the sidebar and detail` | EDIT-04, FILE-10 |
| 同上 | `rejects a blank task name and leaves the task unchanged` | EDIT-04 |
| 同上 | `shows unregistered field values as read-only without a catalog` | EDIT-04 |
| 同上 | `hides delete until a task is selected` | EDIT-09 |
| 同上 | `shows the browser skill note, the eight skill names, and a disabled install button` | SET-05 |
| 同上 | `shows the package version and omits the updates section in the browser` | SET-07 |
| 同上 | `stores the display scale and applies it as --s` | SET-01 |
| 同上 | `stores dark and clears the key when returning to the system scheme` | SET-04 |
| 同上 | `shows the level names above an aligned outline` | VIEW-03 |
| 同上 | `shows the mismatch message and hides add-heading when the outline does not match` | VIEW-03 |
| 同上 | `adds an outline heading from the context menu` | EDIT-18 |
| 同上 | `refuses apply when a meaning is empty and drops a name that was not applied` | EDIT-21 |
| 同上 | `keeps an applied instruction when the hierarchy dialog is opened again` | EDIT-21 |
| 同上 | `drops a blank instruction when the hierarchy dialog is applied` | EDIT-21 |
| 同上 | `shows the old and new end dates in the diff column` | FILE-07 |
| 同上 | `closes the empty diff column with the close button` | FILE-07 |
| 同上 | `copies diff text to the clipboard` | FILE-07 |
| `settingsDesktopChrome.dom.test.tsx` | `shows the version line on display, members, and updates` | SET-07 |
| 同上 | `disables install and remove when every skill target is unchecked` | SET-05 |
| 同上 | `shows the overwrite confirmation when install reports existing paths` | SET-05 |
| 同上 | `copies the mcp json to the clipboard and does not invoke tauri again on copy` | MCP-01 |
| 同上 | `shows the copilot read-screen path and the executable after placing` | MCP-02 |
| 同上 | `shows only the removed read-screen path after confirming uninstall` | MCP-02 |
| 同上 | `disables place and remove when every read-screen target is unchecked` | MCP-02 |
| `contextMenuItems.test.ts` | `lists edit, duplicate, note shortcut, and delete for one task` | EDIT-11, EDIT-06, EDIT-14 |
| 同上 | `switches confidence and lineage labels for a tentative task on mac` | EDIT-11, VIEW-12, FILTER-08 |
| 同上 | `lists only delete when several tasks are selected` | EDIT-11, EDIT-09 |
| 同上 | `lists only add-milestone on an empty chart` | EDIT-11, EDIT-07 |
| 同上 | `offers show-only when another milestone mark is visible` | EDIT-11, FILTER-13 |
| 同上 | `hides show-only when the milestone is the only visible mark` | EDIT-11, FILTER-13 |
| 同上 | `lists only unlink for a connection` | EDIT-11, EDIT-23 |
| 同上 | `lists only unlink for a predecessor` | EDIT-11, EDIT-12 |
| 同上 | `lists category adds and hides delete while the category has tasks` | EDIT-11, EDIT-18, EDIT-19 |
| 同上 | `shows delete for an empty category when another category exists` | EDIT-11, EDIT-19 |
| 同上 | `hides delete for the only category even when it has no tasks` | EDIT-11, EDIT-19 |
| 同上 | `shows delete for an empty group that is not the only one` | EDIT-11, EDIT-19 |
| 同上 | `lists group add and hides delete while it is the only group` | EDIT-11, EDIT-18, EDIT-19 |
| 同上 | `lists milestone-group show-only only when another band has a mark` | EDIT-11, FILTER-11 |
| 同上 | `lists outline adds without delete, and returns nothing when the outline is not aligned` | EDIT-11, EDIT-18 |
| 同上 | `shows delete for an outline branch that can be removed` | EDIT-11, EDIT-19 |
| `operationLabelLink.test.ts` | `maps shared operation IDs to OPERATION_FORMAL` | EDIT-11 |
| 同上 | `keeps fixed context-menu labels from operation-entries` | EDIT-11 |
| 同上 | `keeps dynamic labels` | EDIT-11 |
| 同上 | `labels every operation id` | EDIT-11, EDIT-19 |
| 同上 | `aligns command palette IDs with OPERATION_ID values` | NAV-07 |
| `headlessScheduleSession.test.ts` | `shifts two tasks, keeps the file until save, then clears the diff` | EDIT-02, FILE-02, FILE-07 |
| 同上 | `undo and redo restore the exact saved schedule` | EDIT-10, FILE-02 |
| 同上 | `adds a task, moves it to the empty group, and saves` | EDIT-08, EDIT-15, FILE-02 |
| 同上 | `adds and deletes a milestone, then undo restores it` | EDIT-07, EDIT-10 |
| 同上 | `deletes an empty category and an empty group, then undo restores both` | EDIT-19, EDIT-10 |
| 同上 | `rejects a backwards period, a busy drag, and a filled category without writing` | EDIT-03, EDIT-19, MCP-01 |
| 同上 | `stays the same after save, reload, and save again` | FILE-02, FILE-01 |
| 同上 | `keeps both explanation filter and overlay after two date changes` | VIEW-16, EDIT-02 |
| `headlessScheduleSession.regression.test.ts` | `restores 調査 note and 設計 predecessor after delete undo and redo` | EDIT-10, EDIT-19 |
| 同上 | `restores empty group 後半 after removeGroup and one undo` | EDIT-19, EDIT-10 |
| 同上 | `undoes assignee add clear and reorder on 調査` | EDIT-04 |
| 同上 | `replaces both assignee lists and one undo restores 調査 and 設計` | EDIT-04, EDIT-01 |
| 同上 | `rejects insert when end is before start` | EDIT-08 |
| 同上 | `toggles 設計 confidence without moving dates and one undo restores it` | EDIT-04, EDIT-10 |
| 同上 | `adds and removes a tag with undo redo and leaves the file dirty until save` | EDIT-04, EDIT-10, FILTER-12 |
| 同上 | `clears milestone filter when 承認 is missing from reopened document` | SYNC-03 |
| 同上 | `clears 調査 milestoneId when 承認 is deleted and undo restores both` | EDIT-07, EDIT-10 |
| 同上 | `undo restores 計画 name and keeps category id` | EDIT-13, EDIT-10 |
| 同上 | `undo removes a category added under 計画 and its default グループ` | EDIT-18, EDIT-10 |
| 同上 | `adds unassigned tentative task and relaxes the done filter` | EDIT-08 |
| 同上 | `adds one predecessor and undo leaves link mode data unchanged` | EDIT-05 |
| 同上 | `keeps group id when renaming 前半 and undo restores the name` | EDIT-13, EDIT-10 |
| 同上 | `appends category and default group at document end then undo removes both` | EDIT-18, EDIT-10 |
| 同上 | `appends a group under the chosen category and one undo removes it` | EDIT-18, EDIT-10 |
| 同上 | `duplicates 調査 on full.schedule with unchanged pointed tasks` | EDIT-14, EDIT-10 |
| 同上 | `round-trips assigneeIds through parse and save for unassigned tasks`（未割当は保存 JSON で `assigneeId: null`。`assigneeIds` キーは書かない。再読み込み後はメモリ上で空配列） | FILE-02 |
| 同上 | `changes title only when trimmed text changes and undo restores 回帰確認` | EDIT-20, EDIT-10 |
| 同上 | `formatScheduleDiff includes hidden filtered task date change` | FILE-07, FILTER-01 |
| 同上 | `applyMilestoneEdit group move appears in diff as groupId` | EDIT-07, FILE-07 |
| 同上 | `rejects edit_plan while the detail panel is editing` | MCP-01 |
| 同上 | `adopts one explanation pattern through MCP dispatch` | VIEW-17, MCP-01 |
| 同上 | `rejects apply_explanation_pattern without overlay or with unknown id` | VIEW-17, MCP-01 |
| `headlessScheduleSession.connections.regression.test.ts` | `adds one connection pair and rejects blank labels` | EDIT-23 |
| 同上 | `removeConnectionByPair undo restores and diffText has exactly one 削除 繋がり` | EDIT-23, FILE-07 |
| 同上 | `keeps connections across duplicate and bulk edit` | EDIT-23, EDIT-14 |
| 同上 | `TC-EDIT-23c: relation broken hides connection-only task rows on connections schedule` | EDIT-23, VIEW-02 |
| `headlessScheduleSession.fields.regression.test.ts` | `parseTaskFieldInput and setTaskFieldValueOnCategories per field defs` | EDIT-04, FILE-02 |
| `headlessScheduleSession.hierarchy.regression.test.ts` | `appendOutlineHeadingAtLevel on levels-2.schedule.json commits, saves, and parses` | EDIT-18, FILE-02 |
| 同上 | `appendOutlineHeadingAtLevel on levels-3.schedule.json commits, saves, and parses` | EDIT-18, FILE-02 |
| 同上 | `appendOutlineHeadingAtLevel on levels-4.schedule.json commits, saves, and parses` | EDIT-18, FILE-02 |
| 同上 | `appendOutlineHeadingAtLevel on levels-5.schedule.json commits, saves, and parses` | EDIT-18, FILE-02 |
| 同上 | `TC-HIER-06: levels-2 empty heading children still validates after save` | EDIT-18 |
| 同上 | `insertOutlineSiblingAfter commits and undo removes the sibling` | EDIT-18, EDIT-10 |
| 同上 | `MX-O-97: appendOutlineChildBranch and undo` | EDIT-18, EDIT-10 |
| 同上 | `MX-O-95: renameOutlineBranch and undo` | EDIT-18, EDIT-10 |
| `headlessScheduleSession.levels.regression.test.ts` | `assessHierarchySave rejects level count mismatch` | EDIT-18, FILE-02 |
| 同上 | `applyLevelEditorCommit keeps 回帰の指示 in saved file but not in example source` | EDIT-18, FILE-02 |
| 同上 | `isLevelDraftComplete rejects empty meaning` | EDIT-21 |
| `headlessScheduleSession.explain.regression.test.ts` | `explain_overlay hide clears overlay state` | VIEW-17 |
| 同上 | `explain_view apply and clear` | VIEW-17, MCP-01 |
| 同上 | `pattern rejects with exact messages` | VIEW-17, MCP-01 |
| `mcpCatalogAction.test.ts` | `accepts minimal fields catalog JSON` | MCP-425 |
| 同上 | `rejects members JSON that fails validator semantics` | MCP-425 |
| 同上 | `rejects statuses JSON that fails validator semantics` | MCP-425 |
| `FirstRunHintCard.dom.test.tsx` | `shows the sample heading, three items, and two prepare buttons` | NAV-09 |
| 同上 | `switches the heading when a file is open instead of the sample` | NAV-09 |
| 同上 | `keeps the card and disables only the finished guide action` | NAV-09 |
| 同上 | `keeps open-json enabled after prepare is checked until a file is opened` | NAV-09 |
| 同上 | `disables open-json when a file is already open or the opener is blocked` | NAV-09 |
| 同上 | `dismisses from the close button` | NAV-09 |
| 同上 | `dismisses when Escape is pressed` | NAV-09 |
| 同上 | `shows the try-llm prompt after mcp is checked` | NAV-09 |
| `StatusBar.dom.test.tsx` | `shows the mac and windows save hint text` | NAV-09 |
| 同上 | `omits the hint when saveHint is absent` | NAV-09 |
| `browserDesktopChrome.dom.test.tsx` | `hides the first-run card after dismiss across a remount` | NAV-09 |
| 同上 | `shows the save hint while the document is dirty and clears it after save` | NAV-09 |
| 同上 | `keeps the card when only the prepare item is checked` | NAV-09 |
| 同上 | `omits the first-run card and save hint in the browser runtime` | NAV-09 |
| 同上 | `shows the first-run card in the screenshot runtime without Tauri` | NAV-09 |
| 同上 | `shows a disabled recent-files row and the empty hint on the desktop menu` | NAV-09, FILE-09 |
| 同上 | `omits recent files and clear history from the browser menu and palette` | FILE-09 |
| 同上 | `opens settings in the browser without the screen-state button and shows that button when tauri is on` | MCP-01 |
| 同上 | `omits the screen-state settings section in the browser` | NAV-09 |
| 同上 | `prevents the browser from navigating when a file is dropped` | FILE-08 |
| 同上 | `does not subscribe to schedule drops outside Tauri` | FILE-08 |
| 同上 | `does not poll an external file or write filters in the browser` | SYNC-03, SYNC-01 |
| `GuideDialog.dom.test.tsx` | `shows the four headings while open` | NAV-08 |
| 同上 | `renders nothing while closed` | NAV-08 |
| 同上 | `dismisses from the close button and Escape` | NAV-08 |
| 同上 | `shows the llm example only when the desktop runtime is on` | NAV-08, NAV-09 |
| `searchErrorKeys.dom.test.tsx` | `keeps only tasks whose name contains the query` | FILTER-01 |
| 同上 | `keeps lineage when every filter chip is cleared` | FILTER-01, FILTER-08 |
| 同上 | `focuses the search field and selects its text on ctrl+f` | FILTER-01 |
| 同上 | `filters assignees from the panel and clears one chip` | FILTER-03 |
| 同上 | `filters notes from the note search field` | FILTER-02 |
| 同上 | `keeps only overdue tasks from the due menu` | FILTER-05 |
| 同上 | `keeps broken-link endpoints from the relation menu` | FILTER-06 |
| 同上 | `filters by milestone and keeps selection only for the same row` | FILTER-07 |
| 同上 | `shows all and none only for an empty milestone query` | FILTER-07 |
| 同上 | `caps milestone candidates and keeps the overflow note outside the list` | FILTER-07 |
| 同上 | `replaces a closed milestone label when typing again` | FILTER-07 |
| 同上 | `toggles lineage from the toolbar and the task menu` | FILTER-08 |
| 同上 | `hides a finished group and still offers it when adding` | FILTER-04, FILTER-09 |
| 同上 | `filters confidence and clears the selection` | FILTER-10 |
| 同上 | `filters tags and clears one chip without clearing lineage` | FILTER-12 |
| 同上 | `drops tag selection when the file is opened again` | FILTER-12 |
| 同上 | `keeps only tagged tasks when every file tag is selected` | FILTER-12 |
| 同上 | `keeps tasks with no tag when none are selected` | FILTER-12 |
| 同上 | `scrolls only the tag list and restores hidden checks` | FILTER-12 |
| 同上 | `shows that there are no tags and hides the clear button` | FILTER-12 |
| 同上 | `clears only the tag selection from the tag button` | FILTER-12 |
| 同上 | `drops a deleted tag from the selection` | FILTER-12 |
| 同上 | `scrolls field-filter rows inside the panel` | FILTER-13 |
| 同上 | `hides milestone bands and marks from the panel and the menu` | FILTER-11, FILTER-13 |
| 同上 | `leaves task selection still while the diff list is focused` | FILE-07 |
| 同上 | `focuses the diff list from the keyboard and the chart from a click` | FILE-07 |
| 同上 | `copies the diff text without opening the column` | FILE-07, NAV-07 |
| 同上 | `moves the menu with arrows home and end and closes it with escape` | FILE-01 |
| 同上 | `opens and closes the command palette without the guide` | NAV-07 |
| 同上 | `scrolls the chart with ctrl+arrow and leaves a bare arrow to the field` | NAV-01 |
| 同上 | `changes the sidebar width with arrows and scrolls with ctrl+arrow` | NAV-06 |
| 同上 | `opens the shortcut list from keys and the menu but not from search` | NAV-02 |
| 同上 | `opens the guide and moves to the shortcut list` | NAV-08 |
| 同上 | `moves selection along tasks and reveals only off-screen rows` | EDIT-01, NAV-01 |
| 同上 | `focuses the detail name on enter unless search is focused` | EDIT-04 |
| 同上 | `keeps a duplicate unsaved while composing and closes it with escape` | EDIT-04, EDIT-14 |
| 同上 | `opens the note with ctrl+n and shows the shortcut` | EDIT-06 |
| 同上 | `does not delete a milestone from the delete key` | EDIT-07 |
| 同上 | `opens add dialogs from shortcuts and skips them while typing or linking` | EDIT-07, EDIT-08, EDIT-14, EDIT-15, NAV-07 |
| 同上 | `opens delete confirmation unless search is focused` | EDIT-09 |
| 同上 | `undoes and redoes a move unless search is focused` | EDIT-10 |
| 同上 | `cuts copies pastes and selects all in the name field` | EDIT-04 |
| 同上 | `does not commit name note or hierarchy fields while composing` | EDIT-04, EDIT-21 |
| 同上 | `clears the selection when the name query changes` | FILTER-01 |
| 同上 | `keeps the open schedule when a broken file is rejected` | FILE-01 |
| 同上 | `shows unknown assignees and leaves unassigned tasks` | VIEW-13 |
| 同上 | `drives field, tag, and mark keyboards and the remaining toolbar actions` | FILTER-07, FILTER-12, FILTER-13, EDIT-08 |
| 同上 | `walks save on the edit dialogs` | EDIT-04, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-21 |
| 同上 | `shows the calendar error and keeps the schedule` | SET-03 |
| `memberCatalogEditSession.test.ts` | `closes when the open catalog is removed` | SET-02, SET-08 |
| 同上 | `reloads when another window overwrites the open catalog` | SET-02, SET-08 |
| 同上 | `ignores self save reload` | SET-02, SET-08 |
| 同上 | `ignores unrelated catalogs` | SET-02, SET-08 |
| 同上 | `ignores when no catalog is open` | SET-02, SET-08 |
| 同上 | `skips reload when saved and loaded items match` | SET-02, SET-08 |
| 同上 | `reloads when an item name changed` | SET-02, SET-08 |
| `memberCatalogEditHistory.test.ts` | `undoes one character at a time` | SET-02, SET-08 |
| 同上 | `coalesces identical snapshots` | SET-08 |
| 同上 | `restores selection when undoing a delete` | SET-08 |
| 同上 | `redoes after undo` | SET-08 |
| `catalogEditDraftMessages.test.ts` | `TC-SET-02m: memberDraftError reports blank name` | SET-02 |
| 同上 | `TC-SET-02m: memberDraftError reports blank id` | SET-02 |
| 同上 | `TC-SET-02m: memberDraftError reports duplicate id` | SET-02 |
| 同上 | `TC-SET-02m: memberDescriptionErrorAt reports blank description` | SET-02 |
| 同上 | `TC-SET-08e: statusDraftError reports blank name and duplicate id` | SET-08 |
| 同上 | `TC-SET-08e: statusDescriptionErrorAt reports blank description` | SET-08 |
| 同上 | `TC-SET-09h: colorDraftError reports blank name and duplicate id` | SET-09 |
| `catalogEditImportMessages.test.ts` | `rejects empty catalog id with trailing period (members)` | SET-02 |
| 同上 | `rejects duplicate catalog id (members)` | SET-02b |
| 同上 | `rejects invalid members JSON on read after import` | SET-02 |
| 同上 | `rejects invalid status JSON on read after import` | SET-08 |
| 同上 | `rejects invalid colors JSON on read after import` | SET-09 |
| 同上 | `returns null for empty stored body on read (status)` | SET-08 |
| 同上 | `returns null for empty stored body on read (colors)` | SET-09 |
| 同上 | `rejects browser storage failure with fixed message` | SET-02, SET-08, SET-09 |
| `colorCatalogEditSession.test.ts` | `ignores unrelated catalogs` | SET-09 |
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
| 同上 | `underlines from diamond left through label gap to visible name width`、`does not extend underline past truncated display name`、`uses diamond width only when the display name is empty` | VIEW-04 |
| 同上 | `turns on every id in the group when none are on`、`turns off every id in the group when any are on`、`turns off every id in the group when all are on`、`returns the same set when the group has no milestones` | VIEW-04 |
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
| `filterChips.test.ts` | `drops ids whose milestones are gone` | SYNC-01 |
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
| 同上 | `lists collapsed category id and name while filtered_tasks keeps its tasks` | MCP-01 |
| 同上 | `lists collapsed group id and name` | MCP-01 |
| 同上 | `lists collapsed outline heading as heading kind` | MCP-01 |
| 同上 | `uses an empty collapsed array when nothing is folded` | MCP-01 |
| 同上 | `omits collapsed ids that are not in the document` | MCP-01 |
| 同上 | `puts effective scale when preference is auto and it is not a fixed step` | MCP-01 |
| 同上 | `matches effective scale to a fixed preference step` | MCP-01 |
| 同上 | `sets row density to compact` | MCP-01 |
| 同上 | `sets lightning to false when the line is off` | MCP-01 |
| 同上 | `keeps all five column keys and only status on` | MCP-01 |
| 同上 | `resolves color scheme to dark when preference is system` | MCP-01 |
| 同上 | `keeps light for both preference and effective when light is chosen` | MCP-01 |
| 同上 | `uses default weekends and empty dated arrays when calendar is unset` | MCP-01 |
| 同上 | `loads calendar weekends and named non-working days without path or schemaVersion` | MCP-01 |
| 同上 | `includes view on the three read payloads but not on schedule diff` | MCP-01 |
| 同上 | `does not put scroll, zoom, or dialog flags on view` | MCP-01 |
| `mcpVisible.test.ts` | `includes the left edge day and excludes the day at an exact right boundary`、`marks explanation trial task rows with trial true` | MCP-01 |
| 同上 | `returns null when chart width is zero` | MCP-01 |
| 同上 | `does not extend dates past the timeline when the chart is wider than content` | MCP-01 |
| 同上 | `lists rows that intersect the vertical viewport` | MCP-01 |
| 同上 | `includes sticky header rows that stay pinned above the viewport` | MCP-01 |
| 同上 | `marks a task visible when its row intersects the viewport` | MCP-01 |
| 同上 | `prefers collapsed when ancestors are folded` | MCP-01 |
| 同上 | `prefers collapsed for a folded outline heading even when the task row is in the viewport` | MCP-01 |
| 同上 | `marks scrolledOut when the row exists but is outside the viewport` | MCP-01 |
| 同上 | `omits visibility when the task has no visible row and is not collapsed` | MCP-01 |
| `screenContext.test.ts` | `adds view.visible and collapsed visibility when viewport is supplied` | MCP-01 |
| 同上 | `does not add visibility on selected_task when the task has no visible row` | MCP-01 |
| 同上 | `adds screenCapture message when screenshot failed` | MCP-01 |
| 同上 | `returns text only with too-large message when image makes body exceed limit` | MCP-01 |
| `screen_cli.rs` | `extract_tool_output_writes_image_to_temp_path` | MCP-02 |
| 同上 | `screen_tool_rejects_window_on_set_view` | MCP-02 |
| 同上 | `screen_tool_rejects_window_on_explain_view` | MCP-02 |
| 同上 | `screen_tool_rejects_window_on_explain_overlay` | MCP-02 |
| `mcpEditPlan.test.ts` | `rejects self as predecessor` | MCP-01 |
| 同上 | `moveTask uses outline when levels argument is undefined` | MCP-01 |
| 同上 | `rejects outline moveTask when insert index is out of range` | MCP-01 |
| 同上 | `setTaskDates updates outline task when levels argument is undefined` | MCP-01 |
| 同上 | `leaves document unchanged when insert index is invalid` | MCP-01 |
| 同上 | `stops on first failure` | MCP-01 |
| 同上 | `deleteTask removes playground outline task when categories are empty` | MCP-01 |
| 同上 | `scheduleDocumentForMcpEditPlan clears categories on outline playground` | MCP-01 |
| 同上 | `deleteTask on playground review task after e2e-like preamble uses normalized document` | MCP-01 |
| 同上 | `moveTask on playground review task after e2e-like preamble uses normalized document` | MCP-01 |
| `pendingScheduleOpen.test.ts` | `applies only on the window that matches payload label` | WIN-01 |
| 同上 | `does not apply twice on the same window` | WIN-01 |
| `mcpSetView.test.ts` | `leaves collapse unchanged when patch has no collapsed fields` | MCP-01 |
| 同上 | `keeps vertical scroll unchanged` | MCP-01 |
| 同上 | `accepts lineage with taskId and default includesConnections false` | MCP-01, FILTER-08 |
| 同上 | `omits includesConnections false when lineage has only taskId` | MCP-01, FILTER-08 |
| 同上 | `accepts lineage clear with taskId null` | MCP-01, FILTER-08 |
| 同上 | `rejects includesConnections true without a starting task` | MCP-01, FILTER-08 |
| 同上 | `rejects includesConnections true when clearing lineage` | MCP-01, FILTER-08 |
| 同上 | `rejects malformed lineage object` | MCP-01, FILTER-08 |
| 同上 | `rejects hiddenMilestoneIds when an entry is not a string` | MCP-01, FILTER-13 |
| 同上 | `accepts hiddenMilestoneIds as an empty array` | MCP-01, FILTER-13 |
| 同上 | `rejects unknown lineage task without mutating apply path` | MCP-01, FILTER-08 |
| 同上 | `accepts lineage clear without a document task` | MCP-01, FILTER-08 |
| `useMcpActionExecutor.setView.test.ts` | `applySetView clears explanation for lineage but not for hiddenMilestoneIds` | MCP-01, VIEW-16, FILTER-08 |
| 同上 | `applySetView rejects unknown lineage task without touching filters` | MCP-01, FILTER-08 |
| 同上 | `executeMcpActionTool_set_view passes parsed lineage with connections` | MCP-01, FILTER-08 |
| `screenContext.test.ts` | `adds includesConnections to activeConditions only when connection lineage is on` | MCP-01, FILTER-08 |
| `mcpSetView.dom.test.tsx` | `set_view lineage through executor shows lineage chip and clears explanation` | MCP-01, FILTER-08, VIEW-16 |
| 同上 | `set_view lineage with includesConnections shows connection chip label` | MCP-01, FILTER-08 |
| 同上 | `set_view hiddenMilestoneIds shows mark hidden chip without clearing explanation` | MCP-01, FILTER-13 |
| 同上 | `set_view rejects unknown lineage task without changing status filter chip` | MCP-01, FILTER-08 |
| 同上 | `set_view hiddenMilestoneIds prunes unknown ids and keeps known hidden mark chip` | MCP-01, FILTER-13 |
| `scripts/capture-issue-475-set-view-ui-evidence.mjs` | UI evidence PNGs under `docs/evidence/issue-475/` (1440×900, `--s` 1.15, light/dark; toolbar/chips + chart-context with matched timeline header; baseline vs UI-equivalent after; not MCP) | MCP-01, FILTER-08, VIEW-16 |
| `excelExportColumns.test.ts` | `rejects excelColumns on html export` | MCP-01, EXPORT-05 |
| 同上 | `rejects string array excelColumns as invalid shape` | MCP-01, EXPORT-05 |
| 同上 | `merges sparse excelColumns patch onto saved preferences for one export` | MCP-01, EXPORT-05 |
| 同上 | `rejects unknown excelFieldColumns key before export` | MCP-01, EXPORT-05 |
| 同上 | `uses saved preferences when column options are omitted` | MCP-01, EXPORT-05 |
| 同上 | `resolveFileActionExportColumns does not write export overrides to localStorage` | MCP-01, EXPORT-05 |
| `mcpActionExecutor.file.test.ts` | `file_action export passes resolved boolean excelColumns to runExport` | MCP-01, EXPORT-05 |
| 同上 | `file_action html export rejects excelColumns without calling runExport` | MCP-01, EXPORT-05 |
| `explainView.test.ts` | `parseExplainView_acceptsTaskIdsAndCollapse`、`parseExplainView_rejectsEmptyTaskIds`、`parseExplainView_rejectsUnknownTaskId`、`parseExplainView_rejectsUnknownCollapseId`、`parseExplainView_rejectsTagsAndColorId`、`parseExplainView_rejectsClearWithOtherFields`、`parseExplainView_rejectsEmptyRequest`、`parseExplainView_clearWhenInactive`、`applyExplainView_clearsSelectionWhenTaskIdsChange`、`applyExplainView_keepsSelectionForCollapseOnly`、`composeDisplayedCollapse_usesOverrideOrUserSet`、`composeDisplayedRows_replaceKeepsTaskOutsideUserFilter`、`explanationRead_includesTaskIdsAndBaseCollapsed` | VIEW-16, MCP-01 |
| `screenContext.test.ts` | `includes view.explanation when explanation view is active`、`omits view.explanation when explanation is inactive`、`includes view.explanation milestoneGroupIds and milestoneIds` | VIEW-16, MCP-01 |
| `explainView.test.ts` | `parseExplainView_acceptsMilestoneGroupIds`、`parseExplainView_rejectsHiddenMilestoneGroup`、`parseExplainView_rejectsMilestoneNotInGroupFilter`、`parseExplainView_rejectsMilestoneOutsideFilteredGroup`、`resolveExplanationMilestoneBand_hidesEmptyGroupsWhenStarOnly` | VIEW-16, MCP-01 |
| `explainOverlayLayout.test.ts` | `buildExplanationOverlayGeometry_clipsTaskBarToDate`、`buildExplanationOverlayGeometry_keepsHoleRectWithCustomColor`、`buildExplanationOverlayGeometry_coloredHoleMatchesRenderer`（pxPerDay 8/40、rowHeight 26/32）、`layoutExplanationBalloon_headerStaysWithinHeaderTop`、`buildExplanationOverlayGeometry_placesMilestoneMarkBalloonInBand`、`milestoneMarkBalloon_staysInVisibleOverlayAndPointsFromBelow`、`milestoneMarkBalloon_visibleInMultiRowBand`、`layoutExplanationBalloon_prefersAboveWhenClear`、`layoutExplanationBalloon_avoidsUpperBarLabel`、`planExplanationOverlayScroll_dateOnlyAdjustsHorizontal`、`planExplanationOverlayScroll_firstMarkUsesTaskDate`、`explanationMarkVisibleInViewport_trueWhenScrolledIntoView` | VIEW-16, MCP-01 |
| `explainOverlay.test.ts` | `parseExplainOverlay_acceptsMarkColorHex`、`parseExplainOverlay_rejectsInvalidMarkColor`、`parseExplainOverlay_omitsColorWhenNotSet`、`buildMcpExplanationOverlay_returnsColorWhenSet`、`buildMcpExplanationOverlay_omitsColorWhenNotSet`（ほか VIEW-16 関連） | VIEW-16, MCP-01 |
| `explainOverlayPatterns.test.ts` | `parseExplanationPatterns_acceptsValidPattern`、`parseExplanationPatterns_rejectsUnknownKey`、`parseExplanationPatterns_rejectsDocumentTaskId`、`parseExplanationPatterns_rejectsCrossPatternPredecessor`、`parseExplainOverlay_rejectsPatternsWhenHiding`、`parseExplainOverlay_rejectsInvalidPatternWithoutChangingState`、`buildMcpExplanationPatterns_marksTrialTasks`、`buildDisplayVisibleRowsWithExplanationTrials_insertsTrialRowAfterAnchorAndShiftsY`、`reorderPointerContentYForDocumentRows_subtractsTrialRowsAbovePointer`、`buildExplanationTrialBarLayouts_matchesTaskBarRectInBody`（pxPerDay 8/40、rowHeight 26/32）、`buildExplanationTrialBarLayouts_ignoresLiveAnchorsForDateChange`、`buildExplanationTrialBarLayouts_rendersSameTaskChangePerPattern`、`buildExplanationTrialBarLayouts_mergesUnanimousTaskChangeAcrossPatterns`、`trialMarkBarRect_matchesTaskBarRectInBody`、`parseExplainOverlay_hideRemovesPatternsFromNextShow`、`serializeScheduleDocument_omitsPatternsAndTrialTasks`、`buildExplanationTrialPredecessorArcs_drawsWhenBothAnchorsResolve`、`buildExplanationTrialPredecessorArcs_skipsWhenAnchorMissing`、`applyExplanationPatternToDocument_insertsTrialAfterAnchorAndAppliesChanges`、`applyExplanationPatternToDocument_appliesTaskAndMilestoneChangesTogether`、`applyExplanationPatternToDocument_rejectsUnknownMilestoneId`、`buildExplanationTrialMilestoneLayouts_matchesMilestoneDiamondRectInBand`、`buildExplanationTrialMilestoneLayouts_mergesUnanimousChangeAcrossPatterns`、`applyExplanationPatternToDocument_insertsTrialAfterAnchorInOutline`、`applyExplanationPatternToDocument_rejectsTrialIdCollision`、`applyExplanationPatternToDocument_rejectsMissingAfterTaskId`、`parseApplyExplanationPatternRequest_requiresPatternId` | VIEW-16, MCP-01 |
| `mcpActionExecutor.test.ts` | `executeMcpActionTool_applyExplanationPattern_rejectsWithoutOverlay`、`executeMcpActionTool_applyExplanationPattern_rejectsUnknownPatternId` | VIEW-16, MCP-01 |
| `mcpActionExecutor.file.test.ts` | `TC-MCP-425h: file_action save without a path returns 保存先がありません。` | MCP-01 |
| 同上 | `TC-MCP-425i: file_action save without overwrite or saveAs returns DISK_HASH_MISMATCH` | MCP-01 |
| 同上 | `TC-MCP-425e: catalog_action without save leaves the members file bytes` | MCP-01 |
| 同上 | `set_preferences on writes the auto update key and does not call check` | MCP-01, SET-06 |
| `explanationMarkColor.test.ts` | `parseExplanationMarkColor_normalizesRgbAndRrggbb`、`parseExplanationMarkColor_rejectsLeadingOrTrailingWhitespace`、`parseExplanationMarkColor_rejectsNonHex`、`explanationMarkRingDashStyle_askStaysDashedWithCustomColor`、`explanationMarkHaloStroke_picksContrastingHalo` | VIEW-16, MCP-01 |
| `mcpOperationGate.test.ts` | `rejects file busy even with discardInProgress` | MCP-01 |
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
| 同上 | `color catalog in MCP payloads` | MCP-01 |
| 同上 | `maps catalog entries with light and dark bg only` | MCP-01 |
| 同上 | `returns empty colors on all three read payloads when unset` | MCP-01 |
| 同上 | `includes colorId on tasks when set in categories` | MCP-01 |
| 同上 | `includes colorId on outline tasks when set` | MCP-01 |
| 同上 | `includes unknown colorId on task when not in catalog` | MCP-01 |
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
| `guideContent.test.ts` | `uses the four section titles in order` | NAV-08 |
| 同上 | `matches the first-run checklist order in the opening section` | NAV-08 |
| 同上 | `includes open, save, and diff in 開く・保存` | NAV-08 |
| 同上 | `keeps legacy detail under もう少し知りたいとき` | NAV-08 |
| 同上 | `hides desktop-only items on web` | NAV-08 |
| 同上 | `shows desktop-only items on desktop` | NAV-08 |
| 同上 | `avoids unexplained jargon and defines MCP` | NAV-08 |
| 同上 | `introduces the menu with 画面左上 only on first hamburger mention` | NAV-08 |
| `devFreshStart.test.ts` | `clears when Tauri reports fresh start even if Vite env is off` | NAV-09 |
| `firstRunLlmSteps.test.ts` | `uses the write-schedule skill name in the example prompt` | NAV-09 |
| `firstRunGuidance.test.ts` | `starts with hint not dismissed and save hint not completed` | NAV-09 |
| 同上 | `keeps the screenshot shim on the desktop path and the browser off it` | NAV-09 |
| 同上 | `hides the card, save hint, and empty-history note outside the desktop runtime` | NAV-09 |
| 同上 | `migrates legacy openFile flag to prepareSchedule` | NAV-09 |
| 同上 | `persists checklist items and dismisses when all complete` | NAV-09 |
| `anchorSample.test.ts` | `preserves one ahead and one behind lightning on varied open days` | NAV-09 |
| 同上 | `keeps template progress on the reference day` | NAV-09 |
| 同上 | `shifts milestones with tasks by the same offset` | NAV-09 |
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
| `ScheduleToolbarTitle.test.ts` | `keeps 階層編集 visible while title edit swaps label slot` | EDIT-20, EDIT-21 |
| `appChrome.test.ts` | `uses toolbar-fg for pencil on Raycast toolbar` | EDIT-20 |
| `commandPaletteCss.test.ts` | `maps input and item padding and gaps to --space-sm and --space-md` / `does not keep scaled 8px/10px literals on palette input and items` / `keeps frame chrome on design tokens and unmatched scaled padding` | — |
| `filterDiffStripCss.test.ts` | `maps filter panel grid and field gaps to space tokens` / `maps diff strip header, actions, and list spacing to space tokens` / `uses radius-pill on filter chips without retokenizing bar spacing` / `keeps detail panel left-facing shadow unchanged` / `matches design token literals from uiTokens.ts` | — |
| `DateInput.test.tsx` | `leaves the text input without ui-field when inputClassName is omitted` / `applies inputClassName to the text input only` / `still commits a typed ISO date on blur` | — |
| `detailPanelUiField.dom.test.tsx` | `puts ui-field on detail text fields and keeps the progress range without ui-field` / `uses ui-field on todo text but not on progress range or status checkbox when todos are active` / `persists a status edit from the detail panel` / `enables bulk apply after a status change` | — |
| `explanationTrialTokens.test.ts` | `keeps trial dash at 6,4 and stroke width 2 aligned with CSS focus width` / `requires connectionArcHaloColor on ExplanationTrialBarsLayer (no f8fafc default)` / `passes chart.connectionArcHalo from TimelineChartBodyStage into body layers` | VIEW-16, MCP-01 |
| `HierarchyLevelsDialog.test.ts` | `commits draft via footer 適用, not a second 閉じる` | EDIT-21 |
| `DialogCloseButton.test.ts` | `exposes dismiss label and Esc tooltip` | NAV-07 |
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
| 同上 | `writes outline when levels are omitted` | FILE-04, MCP-01 |
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
| `App.dom.test.tsx` | `TC-HIER-06c: hierarchy draft blocks immediate reload and stays out of the document` | HIER-06, SYNC-01, EDIT-21 |
| `App.dom.test.tsx` | `TC-SET-08m: hides 項目を編集 when workspace statuses are absent` / `…cannot be read` | SET-08, FILE-10 |
| `App.dom.test.tsx` | `TC-SET-10l: shows the pinned extension and 編集用の拡張を作る without 項目を編集` | SET-10, FILE-10 |
| `App.dom.test.tsx` | `TC-SET-02d: workspace member rename changes the row label and leaves the app catalog` | SET-02, FILE-10 |
| `App.dom.test.tsx` | `TC-SET-09c: 色の一覧を作る opens the editor after the workspace reload` | SET-09, FILE-10 |
| `App.dom.test.tsx` | `TC-SET-10m: create editable extension updates the settings buttons and leaves app catalogs unchanged` | SET-10, FILE-10 |
| `App.dom.test.tsx` | `TC-SET-10n: refuses a pinned plugin id and writes only the editable path` | SET-10, FILE-10 |
| `App.dom.test.tsx` | `TC-SET-10o: cancel keeps the editable extension and confirm removes it from settings` | SET-10, FILE-10 |
| `App.dom.test.tsx` | `TC-FILE-07: copy from the diff strip writes the diff text` / `TC-FILE-07g: keep local then 未保存 opens the diff against the file` / `TC-FILE-07g: explicit 未保存 shows the fresh diff while the list is focused` / `TC-FILE-07g: auto diff keeps the prior body while focused and applies after blur` / `TC-FILE-07g: explicit 未保存 replaces a queued auto diff while focused and keeps it after blur` / `TC-FILE-07g: explicit reload with the same body clears a queued auto diff on blur` | FILE-07, SYNC-01 |
| `diffStripVisibility.test.ts` | `defers auto body to body while focused` / `does not defer explicit body update while focused` | FILE-07 |
| `App.flows.dom.test.tsx` | `runs 保存 from the command palette after an edit` / `opens JSON, shortcuts, and guide from the command palette` / `cancels タスク追加 without changing the row count` / `deletes a task after confirm and restores it with undo` / `shows bulk edit then one selection discards the bulk panel` / `stores compact row density and applies 26px task row height` / `opens the shortcuts dialog from the status bar` / `keeps the schedule date while redo is pressed with settings open` / `applies hierarchy rename and saves serialized outline keys` / `writes a tag edit into saved JSON from the detail panel` / `shows no-update UI when the updater returns null` / `opens the diff column from the command palette after an edit` / `toggles the filter panel from the toolbar` / `undoes an edit from the command palette` / `shows lineage for the selected task` / `switches the timeline tier from the toolbar` / `adds a milestone from the split add menu` / `duplicates the selected task from the command palette` / `increases display scale from settings` / `opens the HTML export dialog from the menu` / `opens JSON from the file menu` / `focuses the detail name field from the edit palette command` / `steps display scale in from the keyboard shortcut` / `adds a TODO line and persists it on save` / `opens the task note from the command palette` / `enters link mode from the command palette` / `steps display scale out from the keyboard shortcut` / `runs redo from the command palette after an edit` / `opens the add-connection dialog from the detail panel` / `filters tasks by a tag from the filter panel` / `stores dark color scheme from settings` / `opens the hierarchy dialog from the toolbar` / `warns in the toast when export workspace skips unselected catalogs` | FILE-02, FILE-06, EDIT-06, EDIT-09, EDIT-10, EDIT-21, EDIT-23, FILTER-01, HIER-01, NAV-02, SET-01, SET-06, VIEW-03, EXPORT-01, CMD-01, VIEW-04 |
| `appUpdateUi.test.ts` | `strips a leading v from unknown version labels` / `is true while checking or offering an update` | VIEW-04 |
| `assigneeDisplay.test.ts` | `is true when any id is missing from the catalog` | EDIT-04 |
| `externalReloadFlow.dom.test.tsx` | `TC-SYNC-01: applies a clean disk change after one poll interval` | SYNC-01 |
| 同上 | `TC-SYNC-01b: opens confirm when the screen is dirty and disk differs` / `TC-SYNC-01b: keep local edits and show the deferred reload banner` | SYNC-01 |
| 同上 | `TC-SYNC-01e: lists screen and file sections in the merge review` / `TC-SYNC-01e2: merges screen and file edits and becomes dirty` | SYNC-01 |
| 同上 | `TC-SYNC-01f: blocks merge when the same task conflicts` / `TC-SYNC-01g: restoring the deferred banner on undo after merge` / `TC-SYNC-01h: does not restore the deferred banner after another edit and undo` / `TC-SYNC-01i: clears the deferred banner on redo after undo` / `TC-SYNC-01j: does not restore the deferred banner after save and undo` | SYNC-01 |
| 同上 | `TC-SYNC-01d: prompts to open a missing file after five failed polls` | SYNC-01 |
| 同上 | `TC-SET-02e: closes the member catalog editor on reload without writing the draft` | SET-02, SYNC-01 |
| 同上 | `TC-SET-09d: closes the color catalog editor on reload without writing the draft` | SET-09, SYNC-01 |
| 同上 | `TC-SET-10f: closes the field extension editor on reload without saving` | SET-10, SYNC-01 |
| `fileSaveFlow.dom.test.tsx` | `saves the open path without a dialog and the design end becomes 2026-04-10` / `canceling save leaves the baseline and writes nothing` / `save as then save writes the second change to the new path` / `the save shortcut handler calls save(false) and a dialog blocks it` / `TC-FILE-02c: the save shortcut saves through useAppKeyboard when no dialog is open` | FILE-02, FILE-03 |
| 同上 | `discard on close deletes the recovery file` / `quit cancel keeps the sample path and does not clear the other window hook` | FILE-05 |
| 同上 | `a filter change leaves saveStatusLabel off 未保存` / `setTaskEnd makes saveStatusLabel 未保存` / `schemaVersion 6 opens clean and save writes schemaVersion 8 without tags` | FILE-01, FILE-04 |
| 同上 | `JsonDialog shows the edited task name and save is not invoked` | FILE-06 |
| 同上 | `applyOpenedFile bumps the timeline open epoch and useTimelineView resets scroll` | FILE-01, NAV-03 |
| 同上 | `a level count mismatch reports 保存できません through performSave` / `the saved file contains 回帰の指示 and the example file does not` / `an unapplied name 回帰の下書き is absent from the file` | EDIT-21, FILE-02 |
| 同上 | `opening a file makes resolveStripAfterAutoLoad hide the empty strip` / `the status bar opens the diff from the real file bytes` / `a broken file on disk yields the read error and no diff rows` | FILE-07 |
| 同上 | `opening another file clears undo` | EDIT-10 |
| 同上 | `workspace open and direct parse show the same level names from levels-3` | VIEW-03, FILE-01 |
| 同上 | `a missing recent path keeps the screen and the history order` / `cancel during unsaved does not move the recent entry` / `clear history leaves the open schedule and the recovery file` / `a corrupt recent file yields an empty list and no notice` / `opening from history resets filters and fit` | FILE-09 |
| `startupRecoveryFlow.dom.test.tsx` | `TC-SYNC-03d: opens the saved file when there is no draft` / `TC-SYNC-03: restores unsaved start date for RG-S4-6` / `TC-SYNC-03: restores unsaved edits when the disk matches baseline` | SYNC-03 |
| 同上 | `TC-SYNC-03b: asks whether to open disk or restore when disk differs` / `TC-SYNC-03b: opens the latest file without a dialog when choosing disk` | SYNC-03 |
| 同上 | `TC-SYNC-03e: shows a missing notice without a draft and keeps the sample` / `TC-SYNC-03c: restores edits when the file is missing` | SYNC-03 |
| 同上 | `TC-SYNC-03f: blocks date moves until startup recovery settles` / `TC-SYNC-03g: applies an external update after startup and then allows moves` / `TC-SYNC-03h: restores saved filters on startup` | SYNC-03 |
| `useAppAutoUpdate.flow.test.tsx` | `TC-SET-06d: does not check for updates until the backend asks` / `TC-SET-06e: shows an offer after startup when a same-major update exists` / `TC-SET-06k: ignores a newer major on automatic check` | SET-06 |
| 同上 | `TC-SET-06m: manual check with no update shows the latest message` / `TC-SET-06m2: manual check with an update shows the same offer as startup` / `TC-SET-06m3: manual check shows a failure message when check throws` | SET-06 |
| 同上 | `TC-SET-06m4: manual check treats missing platform as latest on non-Windows` / `TC-SET-06t: manual check redirects Windows stable users to the Store message` | SET-06 |
| 同上 | `TC-SET-06n: hides the corner notice in settings until the updates section is open` / `TC-SET-06c: syncs update UI from other windows through application-update-ui-sync` | SET-06 |
| 同上 | `TC-SET-07: shows the version on display, members, and updates in settings` | SET-07 |
| `scheduleViewPrune.test.ts` | `prunes selection when task is gone` / `keeps selection and lineage when task remains` / `clears invalid lineage and signals connection flag reset` | — |
| `scheduleLineageToggle.test.ts` | `turns off connection-inclusive lineage first` / `clears lineage when active without connections` / `starts lineage from primary selection when inactive` | — |
| `scheduleExplainSession.test.ts` | `clears when explanation view is active` / `clears when translucent overlay is active` / `does not clear when overlay is inactive` | — |
| `scheduleFilterViewApply.test.ts` | `applies persisted category and group collapse keys` / `keeps hierarchy collapse keys from previous set` | — |
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
| 同上 | `meets contrast for connection arcs` | VIEW-15 |
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
| 同上 | `uses 3px on empty and 8px on task bars for primary drags in link mode` | EDIT-12 |
| 同上 | `resolves link mode drags to scroll, link click, or none` | EDIT-12 |
| 同上 | `compares hover and preview ends for pointer updates` | EDIT-12, NAV-01 |
| 同上 | `maps client coordinates into chart rects` | EDIT-12, NAV-01 |
| 同上 | `allows pointerup detail zero and single click detail one` | EDIT-12 |
| 同上 | `compares hover including link identity` | EDIT-12 |
| `mcpInProgressInvalidation.test.ts` | `treats a captured generation as stale after MCP progress bumps` | MCP-01, EDIT-03 |
| 同上 | `does not mark stale when generation matches` | MCP-01 |
| `timelineDragCommit.test.ts` | `allows commit when MCP generation is unchanged` | EDIT-03, MCP-01 |
| 同上 | `rejects commit after MCP generation advanced` | EDIT-03, MCP-01 |
| 同上 | `rejects when caller already cancelled commit` | EDIT-03 |
| `timelineLinkPointerClick.test.ts` | `rejects browser double-click detail` | EDIT-12 |
| 同上 | `rejects a second fire on the same task inside the window` | EDIT-12 |
| 同上 | `allows fire after the window or on a different task` | EDIT-12 |
| `timelineVisibleBarObstacles.test.ts` | `skips rows outside the viewport and skipped task ids` | EDIT-03, EDIT-11 |
| 同上 | `includes visible task bars and summary bars with layout coordinates` | EDIT-03 |
| `timelineHeaderScrollAnchor.test.ts` | `clamps to day range and floors scroll offset` | NAV-01 |
| 同上 | `avoids division by zero when pxPerDay is zero` | NAV-01 |
| `timelineHeaderGrid.test.ts` | `builds month-tier vertical grid lines` | NAV-01, NAV-02 |
| 同上 | `includes header border and year-month label keys` | NAV-01, NAV-02 |
| `summaryBarLayout.test.ts` | `keeps a minimum height and scales with bar height` | VIEW-04 |
| `timelineTaskBars.test.ts` | `exports Konva bar components and shared resize helpers` | VIEW-04, EDIT-02 |
| `timelinePointerLayers.test.ts` | `exports drag-date and link Konva components` | EDIT-02, EDIT-12 |
| `timelineLiveAnchors.test.ts` | `adds linkRight at least six px past the bar left` | EDIT-02, EDIT-03 |
| `timelineDragDatePreviews.test.ts` | `builds a primary preview for a single selected task move` | EDIT-02 |
| `timelineLinkPolylines.test.ts` | `marks predecessor links broken when drag overrides break dependency dates` | EDIT-03, EDIT-12 |
| `timelineLinkPreviewPoints.test.ts` | `builds polyline points from linkRight to preview` | EDIT-12 |
| `timelinePreparedConnectionArcs.test.ts` | `returns empty when there are no connections` | EDIT-12 |
| `timelineExplanationTrialIds.test.ts` | `collects unique milestone ids from trial layouts` | MCP-01 |
| `timelineExplanationBandProps.test.ts` | `clears band explanation props when overlay is inactive` | MCP-01 |
| `timelineExplanationLayers.test.ts` | `exports explanation Konva and balloon wrappers` | MCP-01 |
| `timelineExplainLiveAnchorsRef.test.ts` | `replaces the ref map with live anchors` | MCP-01 |
| `timelineLightningPolyline.test.ts` | `starts and ends on today x at top and body bottom` | VIEW-04 |
| `timelineDragDateChipMetrics.test.ts` | `scales chip typography with header height` | EDIT-02 |
| `timelineBodyGuideMilestones.test.ts` | `keeps milestones with guide lines and band layout` | VIEW-04 |
| `baselineDiffsClassification.test.ts` | `treats conflicting labels as conflicts` | MCP-01 |
| `documentSnapshot.test.ts` | `cloneSnapshot preserves documentToJson equality` | FILE-02 |
| `explainOverlayTrialVisible.test.ts` | `detects explanation trial task rows` | MCP-01 |
| `outlineTaskMap.test.ts` | `maps all tasks in outline` | EDIT-02 |
| `fieldFiltersTypes.test.ts` | `allows an empty field filter record` | FILTER-11 |
| `resolvedColorScheme.test.ts` | `accepts light and dark` | SET-04 |
| `taskRef.test.ts` | `describes a task with category and group` | EDIT-02 |
| `taskTraversal.test.ts` | `visits each task in category group order` | EDIT-02 |
| 同上 | `exports T5 hooks and pure helpers` | VIEW-04, NAV-01 |
| `connectionArcLabelFontSize.test.ts` | `scales with bar height and keeps a readable minimum` | VIEW-04 |
| `colorScheme.test.ts` | `accepts light and dark` | SET-04 |
| `autoUpdate.test.ts` | `treats on as enabled`、localStorage の読み書き、更新確認の失敗を出さない条件、`classifyUpdateCheckError` | SET-06 |
| `storeDistribution.test.ts` | `readStoreDistribution` が Tauri で `is_store_distribution` を呼ぶ | SET-06 |
| `betaRelease.test.ts` | `updater-X` の除外、一覧から最新 Pre-release（アルファ・ベータ）を選ぶ、入っている版より新しいときだけ保存対象、OS に合うファイル名 | SET-06 |
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
| 同上 | `rejects a blank description` | SET-02 |
| 同上 | `rejects empty member id` | SET-02 |
| `memberEdit.test.ts` | `assigns member-N ids`、`assigns custom catalog ids`、`omits empty description on save json`、`allows empty members array`、`rejects whitespace-only description in draft`、`allows empty string description in draft` | SET-02 |
| `screenContext.test.ts` | `omits empty member description and orders members after colors in payload`、`does not put member description on task entries`、`orders members after colors on selected_tasks and filtered_tasks` | MCP-01 |
| 同上 | `mcpMembersForReadTools`（設定ファイル読込成功、パス無し、読込失敗、未選択、通常ウィンドウ） | MCP-01 |

`dates.test.ts` の夏時間のケースは、特定の機能ではなく、日付計算の基礎を確かめるものである。

| `releaseVersion.test.ts` | `accepts stable versions`、先頭 `0` の拒否 | — |
| 同上 | `bumps major, minor, patch on stable only`（Pre-release では失敗） | — |
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
| `sanitize_catalog_id_rejects_empty_without_period` | 空のカタログ名（句点なし） | SET-02, SET-08, SET-09 |
| `sanitize_catalog_id_rejects_path_separators` | `/` `\` を含むカタログ名 | SET-02, SET-08, SET-09 |
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
| 同上 | `connection_curve_uses_top_sites_and_default_curve` | 上端の接続点 0、`curvedConnector3`、矢印なし、ライトの色 | EXPORT-05 |
| 同上 | `connection_curve_label_is_a_separate_textbox` | 8pt、言葉の文字列、ライトの文字色、曲線とは別の文字図形 | EXPORT-05 |
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
| `skill_destinations_stay_under_allowed_bases` | 書き先はユーザー全体か指定フォルダの8スキルに限る | SET-05 |
| `skill_destinations_copilot_user_and_project` | Copilot はユーザー全体で `~/.copilot/skills/`、指定フォルダで `.github/skills/` の8スキルだけ | SET-05 |
| `skill_destinations_all_tools_user_scope` | 3ツール同時のユーザー全体は24パス。並びは Cursor、Claude Code、GitHub Copilot の順で、各8つは `JSON_SKILL_NAMES` の順 | SET-05 |
| `bundled_skill_lists_match_json_skill_names_in_tauri_and_msix` | `JSON_SKILL_NAMES` の各名前が `tauri.conf.json` の `json-skills/<name>/` と MSIX の `json-skills\<name>\SKILL.md` にある。`how-to` は `manual/` の6ファイルも MSIX 必須一覧にある。`read-screen/` と `read-screen\SKILL.md` もある | SET-05 |
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
| `install_copies_how_to_manual_nested_and_uninstall_preserves_neighbors` | `how-to` の `manual/` 6 ファイルをネストごと置き、`canonicalize` がスキルフォルダ内にあること。外すと隣の別名スキルは残る | SET-05 |
| `uninstall_removes_only_bundled_skill_folders` | 外すのは8スキルだけで、別名のスキルは残す | SET-05 |
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
| `uninstall_copilot_removes_only_read_screen_and_leaves_other_skills`（`read_screen_skill.rs`） | Copilot の read-screen だけを外し、別名スキルと Cursor の read-screen は残す | MCP-02 |
| `initialize_echoes_id_and_returns_protocol_version_server_name_and_tools_capability`（`mcp_stdio_client.rs`） | `initialize` が protocolVersion・serverInfo・tools capability を返す | MCP-01 |
| `tools_list_returns_twenty_one_tools_with_each_input_schema`（`mcp_stdio_client.rs`） | `tools/list` が 21 ツールと各 `inputSchema` を返す | MCP-01 |
| `invalid_json_returns_parse_error_then_initialize_still_succeeds`（`mcp_stdio_client.rs`） | 壊れた JSON のあとも次の要求が通る | MCP-01 |
| `unknown_method_returns_method_not_found_and_echoes_id`（`mcp_stdio_client.rs`） | 未知のメソッドが -32601 で id を返す | MCP-01 |
| `tools_call_missing_name_returns_invalid_params_and_not_the_no_window_message`（`mcp_stdio_client.rs`） | 名前のない `tools/call` が -32602 で、ウィンドウ無し文を出さない | MCP-01 |
| `notification_writes_no_line_and_ping_returns_empty_object`（`mcp_stdio_client.rs`） | 通知は応答を書かず、続く `ping` だけが返る | MCP-01 |
| `blank_line_produces_no_response_and_ping_echoes_id`（`mcp_stdio_client.rs`） | 空行のあとの `ping` だけが返る | MCP-01 |
| `mcp_exits_0_when_stdin_closes_without_a_request`（`mcp_stdio_client.rs`） | 要求なしで標準入力を閉じると終了コード 0 | MCP-01 |
| `front_only_tools_with_window_exit_1_with_empty_stdout_and_the_rejection_on_stderr`（`mcp_stdio_client.rs`） | 前面限定 12 ツールが `--window` を標準エラーで拒む | MCP-02 |
| `unknown_screen_tool_exits_1_and_writes_usage_to_stderr`（`mcp_stdio_client.rs`） | 未知の `--screen` ツールが使い方の文を出す | MCP-02 |
| `screen_flag_without_tool_exits_1_and_writes_usage_to_stderr`（`mcp_stdio_client.rs`） | `--screen` だけが使い方の文を出す | MCP-02 |
| `screen_with_extra_arg_exits_1_and_writes_usage_to_stderr`（`mcp_stdio_client.rs`） | 余分な引数が使い方の文を出す | MCP-02 |
| `replace_schedule_over_ten_megabytes_exits_1_and_writes_too_large_to_stderr`（`mcp_stdio_client.rs`） | 10MB 超の標準入力が拒否される | MCP-02 |
| `replace_schedule_invalid_json_exits_1_and_writes_unreadable_to_stderr`（`mcp_stdio_client.rs`） | 壊れたスケジュール JSON が拒否される | MCP-02 |
| `stdin_action_tools_reject_invalid_json_with_exit_1_and_the_action_message`（`mcp_stdio_client.rs`） | 操作 JSON 10 ツールが壊れた入力を拒否する | MCP-02 |
| `schedule_diff_without_gui_exits_1_and_writes_no_window_to_stderr`（`mcp_stdio_client.rs`） | GUI 無しの `schedule_diff` がウィンドウ無し文で失敗する | MCP-02 |
| `tools_call_schedule_diff_without_gui_returns_no_window_text_is_error_and_not_json_rpc_error`（`mcp_stdio_client.rs`） | GUI 無しの `tools/call schedule_diff` が `isError` とウィンドウ無し文を返し、JSON-RPC エラーにならない | MCP-01 |
| `running_app_current_schedule_returns_the_seeded_task_id_and_the_process_is_killed_on_drop`（`mcp_running_app.rs`） | 起動直後のハーネスで `current_schedule` がシード済みタスクを返し、ハーネス破棄で GUI を止める | MCP-01 |
| `screen_seven_reads_and_replace_schedule_exit_0_and_write_the_tool_text_to_stdout`（`mcp_running_app.rs`） | 起動中の読み取り 7 ツールの本文が同状態の `tools/call` と一致し、`--screen replace_schedule` が終了コード 0。`filtered_tasks` の PNG 行は先頭が PNG マジック | MCP-01, MCP-02 |
| `open_windows_lists_main_and_schedule_2_with_file_and_folder_and_only_main_front`（`mcp_running_app.rs`） | `open_windows` が 2 件で `main` と `schedule-2` の相対 `file`・`folder` と前面 1 件を返す | MCP-01, WIN-01 |
| `replace_schedule_changes_screen_keeps_file_bytes_and_identical_second_call_returns_diff_text`（`mcp_running_app.rs`） | `replace_schedule` が画面だけ変え、同一 JSON の 2 回目も差分テキストを返す | MCP-01, SYNC-01 |
| `filtered_and_selected_payloads_order_members_after_colors_and_omit_blank_descriptions`（`mcp_running_app.rs`） | `filtered_tasks` と `selected_tasks` のキー順とメンバー `description` の有無 | MCP-01, SET-02 |
| `schedule_diff_after_open_is_no_difference_text`（`mcp_running_app.rs`） | 未編集の `schedule_diff` が差無し文を返し、ファイルの更新時刻は変わらない | MCP-01, FILE-07 |
| `baseline_diffs_after_screen_edit_and_file_edit_has_screen_file_and_class_lines`（`mcp_running_app.rs`） | `baseline_diffs` が `画面:`・`ファイル:`・`分類:` の順で画面だけ・ファイルだけの id を出す | MCP-01, FILE-07 |
| `selected_task_with_no_selection_returns_null_and_unknown_window_is_specified_missing`（`mcp_running_app.rs`） | 選択 0 件で null、無い `window` で指定ウィンドウ無し文。種ファイルは不変 | MCP-01 |
| `selected_tasks_with_no_selection_returns_empty_array_and_catalog_keys`（`mcp_running_app.rs`） | 選択 0 件で空配列、カタログキー順 | MCP-01 |
| `filtered_tasks_after_set_view_status_lists_only_the_matching_task_names`（`mcp_running_app.rs`） | ステータス絞り込み後のタスク名と `visibility: collapsed` | MCP-01 |
| `current_schedule_returns_the_seeded_document_without_a_members_key`（`mcp_running_app.rs`） | ルートにシードタスクがあり、先頭に `members` が無い | MCP-01 |
| `focus_window_sets_schedule_2_front_and_leaves_both_file_bytes`（`mcp_running_app.rs`） | `open_windows` の `front` が `schedule-2` だけ。両ファイルのバイト列は不変 | MCP-01, WIN-01 |
| `open_new_window_adds_the_third_file_and_keeps_the_first_two_file_and_folder`（`mcp_running_app.rs`） | 3 枚目のラベルと元 2 枚の file・folder が不変。`#[ignore]`（`open_new_window` 1 回でラベルが2枚増え厳密集合が満たせない。別報告 PR #570） | MCP-01, WIN-01 |
| `set_view_filter_leaves_schedule_diff_no_difference_and_file_mtime`（`mcp_running_app.rs`） | 絞り込み後も `schedule_diff` は差無し、更新時刻不変 | MCP-01 |
| `edit_plan_changes_one_date_keeps_mtime_undo_restores_and_save_writes_that_date`（`mcp_running_app.rs`） | 日付変更、保存前は更新時刻不変、undo で戻り、save でディスク一致 | MCP-01, FILE-07 |
| `edit_plan_with_end_before_start_returns_the_date_sentence_and_leaves_file_bytes`（`mcp_running_app.rs`） | 終了日エラー文で画面とファイルは種のまま | MCP-01 |
| `explain_view_limits_filtered_tasks_and_clear_removes_view_explanation`（`mcp_running_app.rs`） | `view.explanation.taskIds` と clear で説明が消える | MCP-01 |
| `explain_overlay_summary_is_on_filtered_tasks_and_hide_removes_it`（`mcp_running_app.rs`） | `explanationOverlay.summary` と非半透明でキーが無い | MCP-01 |
| `apply_explanation_pattern_without_overlay_returns_the_missing_plan_sentence`（`mcp_running_app.rs`） | 半透明無しで「試しの計画がありません。」 | MCP-01 |
| `file_action_export_after_filter_writes_only_the_visible_task_names`（`mcp_running_app.rs`） | 書き出しに見えているタスク名だけ含む | MCP-01, FILE-07 |
| `catalog_action_members_without_save_leaves_the_members_file_bytes`（`mcp_running_app.rs`） | `save` 無しの `catalog_action` でメンバーファイル不変 | MCP-01 |
| `set_preferences_auto_update_false_is_read_back_and_true_restores_it`（`mcp_running_app.rs`） | `autoUpdate` false と true の読み戻し | MCP-01 |
| `history_undo_then_redo_restores_the_edited_date_and_not_the_filter`（`mcp_running_app.rs`） | undo/redo で日付が戻り、絞り込みは残る | MCP-01 |
| `close_window_with_unknown_label_keeps_the_open_windows_list`（`mcp_running_app.rs`） | 無い `close_window` で窓一覧不変 | MCP-01 |
| `minimize_window_with_unknown_label_keeps_the_open_windows_list`（`mcp_running_app.rs`） | 無い `minimize_window` で窓一覧不変 | MCP-01 |
| `two_windows_external_date_appears_and_restart_restores_unsaved_date`（`mcp_running_app.rs`） | 2 窓でディスクの開始日の外部反映と未保存の再起動を見る。`#[ignore]`（ディスクの開始日変更が 10 秒以内に `current_schedule` に載らない。別報告 PR #570） | WIN-01, FILE-10, SYNC-01, SYNC-03, MCP-01 |
| `six_reads_leave_open_windows_front_on_main`（`mcp_running_app.rs`） | 読み取り 6 ツールのあいだも `front` が `main` の 1 件だけ | MCP-01 |
| `focus_window_and_same_path_second_process_both_set_front_to_main`（`mcp_running_app.rs`） | `focus_window` のあと同パス第 2 プロセスで前面が `main` だけ（前面順の新しい方） | MCP-01, WIN-01 |
| `foreign_schedule_viewer_process_fails_without_sending_tools`（`mcp_running_app.rs`） | `sleep` を `schedule-viewer` の名前で起動して検出したあと `assert_no_foreign_schedule_viewer_processes` が panic する（GTK・D-Bus・MCP へ届かない） | MCP-01 |
| `filtered_tasks_follows_the_front_window_status_filter`（`mcp_running_app.rs`） | 同パス 2 窓で前面の絞り込みだけが `filtered_tasks` に効く | MCP-01 |
| `screen_replace_schedule_with_window_exits_1_writes_front_only_sentence_and_leaves_current_schedule`（`mcp_running_app.rs`） | `--screen replace_schedule --window` が終了 1 と前面のみ文。画面は不変 | MCP-01, MCP-02 |
| `open_new_window_keeps_process_alive_and_both_windows_return_current_schedule`（`mcp_running_app.rs`） | 3 枚目追加後もプロセスが生き、元 2 枚と 3 枚目が `current_schedule` を返す。同上 `#[ignore]` | WIN-01, MCP-01 |
| `open_new_window_while_main_is_dirty_keeps_the_edited_date_and_adds_a_window`（`mcp_running_app.rs`） | 未保存のまま 3 枚目が増え、`main` の日付は残る。同上 `#[ignore]` | WIN-01, MCP-01 |
| `close_window_on_main_then_restart_opens_only_schedule_2`（`mcp_running_app.rs`） | `main` を閉じて再起動すると `schedule-2` だけ | WIN-01, SYNC-03, MCP-01 |
| `startup_without_main_in_open_windows_opens_only_schedule_2`（`mcp_running_app.rs`） | 記録に `main` が無いとき起動で `schedule-2` だけ | WIN-01, SYNC-03, MCP-01 |
| `close_window_schedule_2_leaves_only_main_still_answering_current_schedule`（`mcp_running_app.rs`） | `schedule-2` を閉じたあと `main` だけが応答する | WIN-01, MCP-01 |
| `restart_restores_the_front_status_filter_for_the_shared_path`（`mcp_running_app.rs`） | 同パス 2 窓で前面だけの絞り込みが再起動後に戻る。`#[ignore]`（xvfb で schedule-filters 永続化待ちが 60 秒以内に終わらない。別報告 PR #570） | SYNC-03, MCP-01 |
| `second_process_same_path_focuses_newer_window_and_keeps_unsaved_date_and_file_bytes`（`mcp_running_app.rs`） | 同パス第 2 プロセスで新しい窓が前面になり未保存とファイルは不変 | WIN-04, MCP-01 |
| `second_process_other_json_adds_a_window_and_keeps_main_edited_date`（`mcp_running_app.rs`） | 別 JSON の第 2 プロセスで窓が 1 枚増え、`main` の未保存は残る。`#[ignore]`（xvfb で 45 秒以内に窓が増えない。別報告 PR #570） | WIN-04, MCP-01 |
| `second_process_folder_does_not_add_a_window_or_change_current_schedule`（`mcp_running_app.rs`） | フォルダ引数の第 2 プロセスで窓数とタイトルは不変 | WIN-04, MCP-01 |
| `workspace_window_catalogs_differ_from_the_plain_window`（`mcp_running_app.rs`） | 設定ファイル窓だけ作業用カタログが `filtered_tasks` に載る | FILE-10, MCP-01 |
| `focus_rereads_members_statuses_and_calendar_and_leaves_field_names`（`mcp_running_app.rs`） | 前面化でメンバー・ステータス・カレンダーだけ読み直し、拡張名の集合は不変。`#[ignore]`（xvfb でディスク差分の再読込待ちが不安定。別報告 PR #570） | FILE-10, MCP-01 |
| `save_then_restart_keeps_workspace_path_and_field_name`（`mcp_running_app.rs`） | 保存して再起動しても設定ファイル束縛と拡張名が残る。`#[ignore]`（同上） | FILE-10, MCP-01 |
| `catalog_action_save_changes_workspace_member_name_and_leaves_app_members_dir`（`mcp_running_app.rs`） | 設定ファイルのメンバー保存で作業用 JSON だけ変わり、アプリデータの `members/` は不変。`#[ignore]`（xvfb 上で `catalog_action` の `save: true` が「一覧を保存できませんでした。」で失敗するため。別報告 PR #570） | SET-02, FILE-10, MCP-01 |
| `catalog_action_save_changes_workspace_status_color_and_leaves_app_statuses_dir`（`mcp_running_app.rs`） | 設定ファイルのステータス保存で作業用 JSON だけ変わり、アプリデータの `statuses/` は不変。同上 `#[ignore]` | SET-08, FILE-10, MCP-01 |
| `catalog_action_save_on_app_catalog_updates_member_name_on_both_plain_windows`（`mcp_running_app.rs`） | 設定ファイル無し 2 窓で片方のカタログ保存が両方の読み取りに揃う。同上 `#[ignore]` | SET-02, MCP-01 |
| `jsonSkills.test.ts` | `defaultJsonSkillToolSelection` and `hasJsonSkillToolSelection` | SET-05, MCP-02 |
| `install_does_not_write_through_tool_dir_symlink`（`read_screen_skill.rs`） | `.cursor` がシンボリックリンクなら置かない | MCP-02 |
| `mcp_stdio_mode_requires_only_flag` | 引数が `--mcp` だけのとき MCP 起動になる | MCP-01 |
| `tools_list_exposes_screen_tools` | `tools/list` が `open_windows`、読み取り 6 ツール（省略できる `window`）、`current_schedule`、`replace_schedule` を返し、`screen_context` が無い。`selected_tasks` は1件でも配列で、選択数が不明なときはこちらを使うと説明し、`selected_task` は不明なとき `selected_tasks` を使うと説明する。読み取り 7 ツールの説明末尾に「判断の手順は schedule-talk スキルにある。」がある。`replace_schedule` の説明にはその一文が無い。`edit_plan` と `replace_schedule` の説明に、タスクが2件以上変わった成功のあと LLM が `explain_view` と `explain_overlay` の両方で示しチャットでも説明する旨がある。`consultation-flow.md` に「計画を変えたあとの説明」があり、2件以上のとき `explain_overlay`（`summary` と `marks` の `kind: change` など）を必須とする旨、パス無しの差分と削除 id を `explain_view` に渡さない旨がある。`read-screen` スキルに手順の重複が無い。`point-by-appearance.md` に見た目で指す条件の連続した文があり、それらの文は MCP の説明と `read-screen` スキルに無い。「色を選ぶ材料は description」は `screen-judgment.md` にあり `read-screen` に無い（MCP の `selected_task` 等の説明には従来どおりある）。読み取り 3 ツールの説明に `view`、折りたたみでタスクを減らさない旨、自動表示サイズの effective、システム配色の effective、ステータス色を id の材料にしない旨がある。`replace_schedule` の説明に繋がりの規則（`predecessors とは別`、`繋がりの話でない更新では`、`残ったタスク同士はつなぎ直さない` など）がある。`current_schedule` の説明に `connections` と、タスク読み取りには載らない旨がある | MCP-01 |
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
| `src/components/`、`src/hooks/`、`App.tsx` | 検索、絞り込み、エラー表示、メニュー、パレット、ショートカットの DOM は `searchErrorKeys.dom.test.tsx` がテストしている。設定、階層、差分列の DOM は `settingsHierarchyDiff.dom.test.tsx` と `settingsDesktopChrome.dom.test.tsx` がテストしている。Issue #548 の `App.dom.test.tsx` は `App.tsx` 配線上で workspace 操作と外部反映を mock の Tauri・ディスクで見る。`App.flows.dom.test.tsx` は同じ条件でパレット、保存、取り消し、設定、書き出しなどの配線を追加で見る。`settingsHierarchyDiff.dom.test.tsx` はハーネス上の部品を見ており、`App.tsx` への配線までは見ない。Konva の描画、Tauri のダイアログ、ファイルの監視は手で確かめる。キーの判断、チャートの当たり、保存の直列化、起動の世代、監視の停止は純粋関数としてもテストしている |

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
| `examples/connections/schedule.json` | VIEW-15 用。重なる組、離れる組、斜め、あいだの棒、一つから複数、塗った行、端が塗ってある組 | `npm run check:schedule -- examples/connections/schedule.json` |
| `examples/connections/workspace.json` | 上記スケジュールと色の一覧を束ねる設定ファイル | 手動（FILE-10、VIEW-15） |

壊れた JSON は、必須項目を消すか、schemaVersion を 2 にして作る。外部からの書き換えは、開いたファイルを別のエディタで保存して作る。

## 画面なしの操作列

`src/test/headlessScheduleSession` は、起動中の窓を使わない。見本を一時ファイルへ書き、`edit_plan` と履歴は MCP と同じ実行関数を呼ぶ。保存はダイアログを通さず、アプリが書くのと同じ JSON をそのファイルへ置く。タスク、カテゴリ、グループ、マイルストンの追加は、画面が呼ぶ関数のあと、同じ履歴の確定を使う。`run` では `deleteTask`、`commitDocument`（画面と同じ確定。`pushDocumentHistory` で履歴へ積む。選択の整理と説明セッションの消去は画面の `useScheduleDocumentCommit` が行い、この実行器は行わない）、`insertValidatedTask`、`removeGroup`、`apply_explanation_pattern`、`setTitle`、`setDetailPanelEditing` なども呼べる。

この自動テストで見るのは、次である。

- 日付を2件ずらすと未保存の差分が出て、保存するとファイルが変わり、差分が消える
- 保存したあとの変更を、取り消しとやり直しで、保存済みの JSON に戻せる
- タスクを足して別のグループへ移し、保存したファイルに残る
- マイルストンを足して消し、取り消しで戻して保存する。削除で他タスクの `milestoneId` が外れ、取り消しで戻る
- 空のカテゴリと、空で唯一ではないグループを消し、取り消しで戻る
- 終了が開始より前の期間、ドラッグ中の更新、タスクのあるカテゴリの削除は拒否され、ファイルは変わらない
- 保存して読み直し、もう一度保存しても中身は同じ
- 2件の日付変更のあと、説明用の絞り込みと半透明が両方ある
- 繋がりの追加・ラベル変更・組の削除、複製と一括編集で繋がりが増えないこと、破綻系統で接続だけの行が出ないこと
- 拡張項目の入力とカテゴリへの反映、見本外の階層保存、`levels` の段数だけ変える保存の拒否
- 複製で写る項目と元タスクの先行、説明オーバーレイの消去、絞り込みで隠したタスクの日付変更が差分テキストに残ること
- 未割当タスクの保存ファイルは `assigneeId: null` であり、メモリ上の `assigneeIds` は空配列のまま往復する

まだ手で見るのは、バーのドラッグ、削除の確認ダイアログ、IME、描画のずれ、本物の LLM の文、起動直後の実ドラッグ、右クリック直後のポインタである。

## 手動テストケース

手動の通しは [regression.md](regression.md) にまとめた。既存ケースの全文は [regression-tc.md](regression-tc.md) にある。ここには同じ表を重ねて置かない。新しい手動ケースは regression-tc.md と `docs/regression-tc-ids.txt` に足し、`npm run check:regression-coverage` が通ることを見る。

人が必ず行う範囲は [regression.md](regression.md) の「実施範囲の索引」と「結果の記録」を正とする。旧い短い通し（RG-S2 から RG-S4 を一括で回す定義、目安 約 22 分・手順 72）は必須範囲の定義ではない。代表手順 62 と全体目安 約 2 時間 10 分は [regression.md](regression.md) の見積と同じで、実測ではない。Windows と macOS の所要時間は未測定である。自動化予定、保留、未検証、対象外が残るあいだは、この通しを終えても全機能を確認し終えたことにはしない。自動は、その前に regression.md の「自動を先に流す」を実行する。前提に書いていないときはデスクトップ版のサンプルから始める。TC-MCP-01、TC-MCP-01b、TC-MCP-01c は macOS だけ実機確認済みで、Ubuntu と Windows は未確認である。TC-MCP-01k から TC-MCP-01o は本物のチャットで判定し、未提供の値の補完や色だけの id 選択は失敗である。ブラウザ版では TC-SYNC-01c を加え、TC-SYNC-03 は対象外である。

## リリース前確認

各 OS の配布物で、次を上から実行する。番号の手順と期待は [regression-tc.md](regression-tc.md) のその ID である。macOS（Apple Silicon）は GitHub Releases の dmg で同じ項目を見る。Intel Mac や開発中は、確認に使う Mac の上でビルドしたアプリでも同じ項目を見る。ブラウザ版では TC-SYNC-01c を加え、TC-SYNC-03 は対象外にする。

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
11. Ubuntu では deb のインストールと起動を見る。Apple Silicon の Mac では dmg のインストールと起動を見る（TC-SET-06u）。安定版の Release 後、Windows では Store の更新、実行エイリアス、更新欄、MCP のエイリアスを見る。Pre-release では NSIS が署名されていること（ジョブログ）、`schedule-viewer-codesign.cer` があること、証明書を二つのストアへ入れた PC で発行元が `schedule-viewer` になること、入れていない PC で SmartScreen の確認が出ることを見る
12. 安定版の `SHA256SUMS` に deb、dmg、`latest.json` など Release のファイルが含まれ、各ファイルのハッシュが一致することを見る。安定版の `latest.json` に `linux-x86_64` と `darwin-aarch64` があることを見る。Pre-release では `windows-x86_64` も含まれる
13. 安定版の Release 本文にダウンロード手順とその版の CHANGELOG 節の本体（版見出しは無い）があり、番号がある項目の `(#番号)` がリンクになっていることを見る。番号が無い項目は本文のまま載る。CHANGELOG にその版の節が無いときは本文ジョブが失敗し、本文はダウンロード手順のまま残る。`[Unreleased]` と前の版の節は載らない。Pre-release の本文は確認用の短い文だけで、CHANGELOG 節は無い
14. TC-SET-06b から TC-SET-06q で自動更新、手動確認、Pre-release 保存、設定の変更履歴を見る（新しい Release が無いときは TC-SET-06e は Release 公開後に見る）
15. この仕組みを初めて使う Pre-release では、Windows に Pre-release を入れたあと、安定版は Microsoft Store から入れ直すことを確認する
16. 安定版の Release 後、`checksums` が `updater-X` の `latest.json` を更新していることを見る。Pre-release では `updater-X` は更新されない。より大きいメジャーの安定版が無いときだけ、その版が Latest になる
