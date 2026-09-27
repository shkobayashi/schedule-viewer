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
| バージョン | `npm run version:check` | 5ファイルのバージョン番号 |
| スキル同梱物 | `npm run build:validate-skill` のあと、CI と同じパスで `git diff --exit-code` | スキーマコピーと検証 bundle の差分 |

画面用のテストランナー（jsdom、Testing Library、Playwright）は入っていない。

## CI での実行

| ワークフロー | きっかけ | 実行するもの |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `develop` 向けの pull request | 変更パスがフロントなら `version:check`、`build`、`lint`、`test`、`check:schedule`、`check:calendar`、`build:validate-skill`、スキル同梱物の差分。Rust なら Clippy と `cargo test --locked` |
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
| `dates.test.ts` | `steps across US DST end without losing a calendar day` | — |
| 同上 | `supports fractional days for timeline dragging` | EDIT-02 |
| 同上 | `formats UTC calendar date` | VIEW-07 |
| `exportHtml.test.ts` | `puts the active filter into HTML and SVG` | EXPORT-01, EXPORT-02 |
| `exportView.test.ts` | `keeps milestones inside the visible span and referenced ones outside it` | EXPORT-02 |
| 同上 | `keeps only the selected milestone` | EXPORT-02 |
| 同上 | `drops milestones when the filter is none` | EXPORT-02 |
| 同上 | `spans the visible tasks and exported milestones, not hidden dates` | EXPORT-02 |
| 同上 | `returns empty text when every filter is the default` | EXPORT-02 |
| 同上 | `lists only the filters that are on` | EXPORT-02 |
| `memberAppData.test.ts` | `drops a leading BOM and leaves other text unchanged` | SET-02 |
| 同上 | `stores imported JSON without a BOM and reads it back` | SET-02 |
| 同上 | `imports the sample only once when two seeds overlap` | SET-02 |
| 同上 | `does not restore a sample catalog after it was removed` | SET-02 |
| `nonWorkingDay.test.ts` | `defaults to Sat/Sun when calendar is null` | VIEW-09 |
| 同上 | `respects workingDays override on weekends` | VIEW-09, SET-03 |
| 同上 | `treats an empty weekends list as no weekday holidays` | VIEW-09 |
| 同上 | `does not paint days past the schedule end` | VIEW-09 |
| 同上 | `respects nonWorkingDays on weekdays` | VIEW-09 |
| `rows.test.ts` | `matches note substring independently of name` | FILTER-02, FILTER-09 |
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
| 同上 | `does not treat a category rename as a rename` | FILE-07 |
| 同上 | `ignores predecessor order when the set is unchanged` | FILE-07 |
| 同上 | `shows a milestone date shift and a title change` | FILE-07 |
| 同上 | `writes milestone order and category order when the remaining items swap` | FILE-07 |
| 同上 | `writes a group order line when groups in a category swap` | FILE-07 |
| 同上 | `writes a missing note as （なし）` | FILE-07 |
| `scheduleExternalReload.test.ts` | `returns invalid for broken JSON` | SYNC-01 |
| 同上 | `returns noop when canonical matches baseline` | SYNC-01, FILE-04 |
| 同上 | `returns confirm when dirty and content differs` | SYNC-01 |
| 同上 | `returns confirm when an edit dialog is open` | SYNC-01 |
| 同上 | `returns apply when clean and content differs` | SYNC-01 |
| `scheduleMigrate.test.ts` | `rejects v1 after date migration because v2 is no longer supported` | FILE-01 |
| 同上 | `rejects v2 documents` | FILE-01 |
| 同上 | `accepts assigneeId` | FILE-01 |
| `scheduleRecovery.test.ts` | `accepts a valid draft` | SYNC-03 |
| 同上 | `rejects invalid document JSON` | SYNC-03 |
| 同上 | `returns none when no draft` | SYNC-03 |
| 同上 | `restores when disk matches baseline` | SYNC-03 |
| 同上 | `returns conflict when disk differs from baseline` | SYNC-03 |
| 同上 | `returns invalidDraft for broken draft wrapper` | SYNC-03 |
| 同上 | `returns diskMissing when file not found` | SYNC-03 |
| 同上 | `restores when disk formatting differs but canonical matches` | SYNC-03, FILE-04 |
| 同上 | `returns invalidDisk when the file fails validation` | SYNC-03 |
| `serialize.test.ts` | `omits empty note` | EDIT-06 |
| 同上 | `includes trimmed note` | EDIT-06 |
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
| `taskEditCycles.test.ts` | `detects indirect cycles` | EDIT-05 |
| 同上 | `detects a direct cycle` | EDIT-05 |
| 同上 | `clears a cycle once the closing predecessor is removed` | EDIT-05 |
| 同上 | `accepts acyclic edits` | EDIT-05 |
| `taskNote.test.ts` | `trims and drops blank` | EDIT-06, VIEW-11 |
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
| `colorScheme.test.ts` | `stores fixed schemes and clears key for system` | SET-04 |
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

## 自動テストが無いところ

次のモジュールには、専用のテストが無い。一部は他のテストから間接的に使われる。

| モジュール | 状態 |
| --- | --- |
| `history.ts` | 未テスト |
| `dependencies.ts` | 破綻と系統は未テスト。循環の検出は、`taskEditCycles.test.ts` が `scheduleSemantics.ts` 側でテストしている |
| `timeline.ts` | 期限超過、イナズマ線、ズーム段階は未テスト |
| `milestones.ts` | マイルストン超過と段の割り当ては未テスト |
| `rows.ts` | ノートとマイルストン以外の絞り込み、`computeVisibleRows`、折りたたみは未テスト |
| `exportFilename.ts` | 未テスト。Rust 側が似たファイル名処理をテストしている |
| `scheduleFile.ts` | Tauri とブラウザの I/O は未テスト |
| `tasks.ts` | 追加と削除の操作は未テスト |
| `validationMessages.ts` | 文言の組み立ては未テスト |
| `errors.ts` | 未テスト |
| `timelineVisibleDays.ts` | 未テスト |
| `layoutSizes.ts` | 未テスト |
| `src/components/`、`src/hooks/`、`App.tsx` | 画面の自動テストは無い |

足すなら、手間のわりに効果が大きい次の順がよい。

1. `history.ts`。100件の上限と、同じ内容を積まないこと
2. `dependencies.ts`。破綻の境界（同じ日は破綻でない）と系統
3. `timeline.ts`。期限超過とイナズマ線
4. `rows.ts`。担当、ステータス、期限、破綻の組み合わせ
5. `tasks.ts`。追加時に外す絞り込みと、削除時の先行の除去

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
| `examples/playground.members.json` | サンプルと同じ4人 | 自動では見ない |
| `examples/jp-2026.calendar.json` | 土日と、非稼働日 18件。振替出勤は空 | `npm run check:calendar` |

壊れた JSON は、必須項目を消すか、schemaVersion を 2 にして作る。外部からの書き換えは、開いたファイルを別のエディタで保存して作る。

## 手動テストケース

前提に書いていないときは、デスクトップ版を起動し、サンプルが表示された状態から始める。ブラウザ版で結果が違う場合は、そのケースに書く。

| ID | 機能 | 前提 | 手順 | 期待結果 |
| --- | --- | --- | --- | --- |
| TC-FILE-01 | FILE-01 | 検証済みの JSON がある | 「開く」でそのファイルを選ぶ | 画面がその内容になり、見出しがファイル名になる |
| TC-FILE-01b | FILE-01 | schemaVersion 2 の JSON がある | 「開く」で選ぶ | 開かず、理由が出る。それまでの保存先は変わらない |
| TC-FILE-02 | FILE-02 | ファイルを開き、バーを動かして未保存にする | 「保存」を押す | 見出しから「未保存」が消え、ファイルの内容が画面と一致する |
| TC-FILE-03 | FILE-03 | サンプルを編集する | 「別名保存」で新しいパスを選ぶ | そのパスに JSON ができ、次の「保存」はそのパスへ書く |
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
| TC-SYNC-03b | SYNC-03 | 控えがあるあいだに、別のエディタでファイルを変える | アプリを起動する | 「ファイルを開く」か「未保存の編集を戻す」かを聞く |
| TC-SYNC-03c | SYNC-03 | 控えの対象ファイルを消す | アプリを起動する | 復旧用の控えのダイアログが出る。「控えを破棄」で次から出なくなる |
| TC-VIEW-01 | VIEW-01 | サンプル | 左の行を上から見る | カテゴリ、グループ、タスクの順で、JSON の配列順に並ぶ |
| TC-VIEW-02 | VIEW-02 | 進行中のタスクがある | そのバーを見る | 薄青の地に、進捗率の濃い部分がある。完了は緑、未着手は灰 |
| TC-VIEW-03 | VIEW-03 | 子の期間が離れているグループ | 親の行を見る | 半分の高さで、途切れた期間は薄い色になる |
| TC-VIEW-04 | VIEW-04 | 日付が近く名前が長いマイルストンが複数ある | 日付ヘッダーの下を見る | ひし形と名前が出る。重なるときは段が増える。チャート全体の縦線は無い |
| TC-VIEW-05 | VIEW-05 | 終了日が昨日の未完了タスクと、終了日が今日の未完了タスク | 両方のバーを見る | 昨日で終わるものだけが赤い |
| TC-VIEW-06 | VIEW-06 | 対応マイルストンより終了日が後のタスクと、当日で終わるタスク | 行を見る | 後のタスクだけ、右が半透明の赤になり「超過」が出る |
| TC-VIEW-07 | VIEW-07 | 期限超過の行と、進行中で開始日が明日の行 | 橙の線を見る | 超過の行では終了日まで左へ、未来に開始する着手済みの行では開始日まで右へ折れる |
| TC-VIEW-08 | VIEW-08 | 後続の開始が先行の終了より前の組と、同じ日に始まる組 | 線を見る | 先行の終了より前に始まる組の線だけが赤い。どちらかを折りたたむと線は消える |
| TC-VIEW-09 | VIEW-09 | カレンダー未設定で日表示 | 背景を見る | 土日だけが薄い灰。月表示では日ごとに塗らない |
| TC-VIEW-10 | VIEW-10 | 使用中カタログがある | 割り当てなし、一致する ID、存在しない ID の行を見る | 「割り当てなし」は破線、「メンバー不明」は点線と ID、一致は表示名 |
| TC-VIEW-11 | VIEW-11 | ノートがあるタスクと無いタスク | ノートアイコンを押す | 色が違い、本文が出る。無いタスクは「ノートはありません」 |
| TC-NAV-01 | NAV-01 | 期間が画面より広い | チャートをドラッグし、ホイールと Shift+ホイールを回す | ドラッグは縦横、ホイールは縦、Shift+ホイールは横に動く |
| TC-NAV-02 | NAV-02 | 週表示 | Ctrl または ⌘ を押してホイールを回す | ポインタの位置を保ったまま拡大し、十分拡大すると「日表示」、縮小すると「月表示」になる |
| TC-NAV-03 | NAV-03 | 横にスクロールした状態 | 「Fit」を押す | 期間が幅に入り、横位置が先頭に戻る |
| TC-NAV-04 | NAV-04 | タスクがあるグループ | 三角を二度押す | 一度で配下の行が隠れ、親バーは残る。二度で戻る |
| TC-NAV-05 | NAV-05 | 左の幅に収まらないタスク名 | その名前を横にドラッグする | 続きが読める。担当と「超過」は動かない |
| TC-NAV-06 | NAV-06 | 左の一覧とチャートの境界 | 境界を横にドラッグし、ダブルクリックする。ウィンドウを狭めてから広げる | 一覧の幅が変わり、チャートは残った幅に合う。ダブルクリックで既定の幅に戻る。名前の横ずらしは残る。ウィンドウを狭めると表示だけ縮み、広げると戻る |
| TC-FILTER-01 | FILTER-01 | サンプル | タスク名の一部を入れる | その文字を含むタスクだけが残る |
| TC-FILTER-02 | FILTER-02 | ノートがあるタスクと無いタスク | ノートの一部を入れる | ノートにその文字を含むタスクだけが残る |
| TC-FILTER-03 | FILTER-03 | 割り当てなし、メンバー不明、名前を表示できる担当が混在 | 「割り当てなし」を選ぶ | 割り当てなしとメンバー不明が残り、名前を表示できる担当のタスクは消える |
| TC-FILTER-03b | FILTER-03 | 同上 | 特定のメンバーを選ぶ | その ID だけが残り、メンバー不明は出ない |
| TC-FILTER-04 | FILTER-04 | 完了と未完了が混在 | 「完了以外」を選ぶ | 完了のタスクが消える |
| TC-FILTER-05 | FILTER-05 | 期限超過と期限内が混在 | 「期限超過」を選ぶ | VIEW-05 のタスクだけが残る |
| TC-FILTER-06 | FILTER-06 | 破綻している組と、していない組 | 「前後: 破綻のみ」を選ぶ | 破綻している線の両端だけが残る |
| TC-FILTER-07 | FILTER-07 | マイルストン付きと無しが混在 | 「なし」を選ぶ | 対応が無いタスクだけが残る |
| TC-FILTER-07b | FILTER-07 | 同上 | 特定のマイルストンを選ぶ | それを指すタスクだけが残る |
| TC-FILTER-08 | FILTER-08 | 枝分かれした前後関係 | 枝の途中を選んで「系統」を押す | その起点の先行と後続だけが残る。起点を通らない枝は出ない。もう一度で解除する |
| TC-FILTER-09 | FILTER-09 | あるグループのタスクがすべて完了 | 「完了以外」を選ぶ | そのグループの行も消える。追加ダイアログでは、そのグループをまだ選べる |
| TC-EDIT-01 | EDIT-01 | サンプル | バーをクリックし、次に背景をクリックする | バーで選択され端のハンドルが出る。背景で外れる。左の行をクリックしても選択されない |
| TC-EDIT-01b | EDIT-01 | タスクを選択している | 絞り込みを変える | 選択が外れる |
| TC-EDIT-02 | EDIT-02 | タスクを選択できる | ⌘ または Ctrl を押しながらバーを横へドラッグして離す | 開始と終了が同じ日数だけ動く。修飾が無いドラッグはスクロールのまま |
| TC-EDIT-03 | EDIT-03 | タスクを選択している | 右端を左へ、1日より短くなるところまでドラッグする | 1日で止まり、終了日が開始日より前にならない |
| TC-EDIT-04 | EDIT-04 | サンプル | バーをダブルクリックし、名前を空にして保存する | 保存されず、理由が出る。Escape では変更が残らない |
| TC-EDIT-05 | EDIT-05 | 3件以上のタスク | 編集で、自分を先行にしようとする。次に、循環する先行を保存する | 自分は候補に出ない。循環は保存されず、理由が出る |
| TC-EDIT-05b | EDIT-05 | タスクが50件を超えるスケジュール | 先行の検索を空のまま開く | 「さらに絞り込んでください」と出る |
| TC-EDIT-06 | EDIT-06 | ノートが無いタスク | ノートアイコンから文字を保存し、次に空白だけを保存する | 一度目でノートが付き、二度目でノートが消える |
| TC-EDIT-07 | EDIT-07 | マイルストンがある | ひし形を横にドラッグして離す。次にダブルクリックで名前を空白にして保存する | 日付は離した位置になる。空白の名前は元の名前のまま残る |
| TC-EDIT-08 | EDIT-08 | タスクを選択し、「完了」で絞っている | 「追加」で、選択中のグループに今日から1日のタスクを足す | そのグループの末尾に、割り当てなし・未着手で足される。絞り込みは「すべて」に戻り、新しい行が選択される |
| TC-EDIT-08b | EDIT-08 | 追加ダイアログ | 終了日を開始日より前にして保存する | 追加されない |
| TC-EDIT-09 | EDIT-09 | 先行を持つタスクを選択 | 「削除」を確認する | タスクが消え、他の先行からも外れ、残ったタスク同士はつながらない |
| TC-EDIT-09b | EDIT-09 | タスクを選んでいない | 「削除」を見る | 押せない |
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
9. TC-SYNC-03 で未保存の復元を見る
10. TC-VIEW-05 と TC-VIEW-07 で赤とイナズマ線を見る
11. Ubuntu では deb のインストールと起動、Windows では NSIS と SmartScreen の表示を見る
12. `SHA256SUMS` と配布物のハッシュが一致することを見る
