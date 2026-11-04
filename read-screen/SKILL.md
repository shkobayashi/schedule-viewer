---
name: read-screen
description: >-
  Replaces the open schedule as unsaved while the schedule-viewer desktop app is
  running, when MCP cannot be called. JSON shape follows write-schedule output;
  does not write files. Use schedule_diff / baseline_diffs / selected_task /
  selected_tasks / filtered_tasks / current_schedule / open_windows /
  replace_schedule via MCP when
  available, else bundled --screen commands. Judgment (window choice, screen
  updates, pointing by appearance) lives in the schedule-talk skill. Not for new
  schedule files or when the app is not running (use write-schedule). Distinct
  from write-members and write-calendar.
---

# read-screen

判断の手順は schedule-talk スキルにある。ウィンドウの当て方、未保存の置き換え、見た目で指す手順は、schedule-talk の reference を読む。

schedule-viewer のデスクトップ版ウィンドウと連携するスキルです。起動しているとき、開いているスケジュールの更新を未保存として置き換えます。JSON の形は `write-schedule` の出力形に従い、ファイルには書きません。新しいスケジュールファイルの作成、デスクトップ版が起動していないときのファイル作成、`write-members`、`write-calendar` は別です。

## 渡すもの（MCP と同じ）

読み取りは、必要なものだけ使います。まとめて呼ぶ必要はありません。

| 目的 | MCP ツール名 | コマンドの引数 |
| --- | --- | --- |
| 開いているウィンドウ一覧 | `open_windows` | `--screen open_windows` |
| 差分テキスト | `schedule_diff` | `--screen schedule_diff` |
| 起点・画面・ファイルの差分と分類 | `baseline_diffs` | `--screen baseline_diffs` |
| 選択が1件のときのタスク（「このタスク」） | `selected_task` | `--screen selected_task` |
| 編集の選択（「これらのタスク」） | `selected_tasks` | `--screen selected_tasks` |
| オンな絞り込みと残るタスク | `filtered_tasks` | `--screen filtered_tasks` |
| 画面のスケジュール JSON 全体 | `current_schedule` | `--screen current_schedule` |

### 前面ウィンドウ向けの操作

操作の JSON は標準入力で渡します。`discardInProgress: true` があるときだけ、詳細や一括の入力途中、並べ替えや日付バーのドラッグ、開いているダイアログを確定せず閉じてから実行します。起動復旧中とファイル書き込み中は、この印があっても拒みます。

| 目的 | MCP ツール名 | コマンド |
| --- | --- | --- |
| 見方（絞り込み、折りたたみ、表示、ズーム、スクロール、Fit など） | `set_view` | `--screen set_view`（stdin に JSON） |
| 説明のための絞り込みと折りたたみ | `explain_view` | `--screen explain_view`（stdin に JSON） |
| 説明の半透明 | `explain_overlay` | `--screen explain_overlay`（stdin に JSON） |
| 試しの計画を計画へ入れる | `apply_explanation_pattern` | `--screen apply_explanation_pattern`（stdin に `patternId`） |
| 計画の部分更新（日付、担当、並べ替え、先行） | `edit_plan` | `--screen edit_plan` |
| 保存、別名保存、書き出し、開く、設定ファイルの書き出し | `file_action` | `--screen file_action` |
| 一覧（メンバー、色、ステータス、追加項目） | `catalog_action` | `--screen catalog_action` |
| JSON 作成スキルと起動時の更新確認 | `set_preferences` | `--screen set_preferences` |
| 取り消しとやり直し（1 段） | `history` | `--screen history` |
| ウィンドウを前面に | `focus_window` | `--screen focus_window` または `--screen focus_window --window <label>` |
| 新しいウィンドウで開く | `open_new_window` | `--screen open_new_window` |
| ウィンドウを閉じる | `close_window` | `--screen close_window` または `--screen close_window --window <label>` |
| 最小化 | `minimize_window` | `--screen minimize_window` または `--screen minimize_window --window <label>` |

`focus_window`、`close_window`、`minimize_window` だけ `--window` を付けられます。`open_windows`、`replace_schedule`、上表の前面向け操作に `--window` を付けたときは、CLI は拒否文を標準エラーへ出して終了コード 1 にします。

背面のウィンドウを読むときは、MCP では読み取り 6 つに `window` 引数（`open_windows` の `label`）を付けます。MCP が使えないときは `--screen <読み取り> --window <label>` です。`open_windows` と `replace_schedule` に `--window` は付けません。

`selected_tasks` は、選択が1件でも配列で返します。選択が無いときは空の配列です。選択数が不明なときは `selected_tasks` を使います。`selected_task` は、選択がちょうど1件のときだけそのタスクを返し、0件と2件以上は null です。

絞り込みをスキル側でやり直さないでください。画面が使っている条件のまま返します。

`selected_task`、`selected_tasks`、`filtered_tasks` の応答には、`levels` と `statuses`（各項目に `color.light.bg`、`color.light.border`、`color.dark.bg`、`color.dark.border`。ステータスの色はバーの見た目である。id を選ぶ材料にしない。選ぶ材料は description である。）のあとに `colors`（使用中の色の一覧。一覧が無いときは空の配列）、続けて `members`（メンバー一覧。一覧が無いときは空の配列。空でない `description` がある人だけ `description` も入る）、続けて `fields`（使用中の追加項目の定義。定義が無いときは空の配列）、続けて `view`（折りたたみ、今映っている日付と行、表示サイズ、行の密度、イナズマ線、左一覧の追加列、配色、稼働日カレンダー。`view.collapsed` は今畳んでいる行（kind、id、name）。`view.explanation` は説明のための見え方が掛かっているときだけ載り、`taskIds` と `baseCollapsed` を含みます。`view.explanation.baseCollapsed` は人が選んだ折りたたみです。`view.visible.dates` はチャートに掛っている日付の start と end です。`view.visible.rows` は縦に見えている行と上に残している見出しです。試しの新しいタスク行だけ kind が task の要素に `trial: true` を載せます。各タスクの `visibility` は visible、collapsed、scrolledOut のいずれかで、見えている、畳んで隠している、スクロールの外を表します。折りたたみではタスクを減らさない。`filtered_tasks` の tasks には畳んだ行のタスクも残る。explanationOverlay は半透明が出ているときだけ載り、`translucent`、`summary`、各印（`taskId` または `date`、`kind`、`label`、任意の `number`、任意の `color`、`visible`）を含みます。任意の `patterns`（各パターンの `id`、`name`、`color`、試しの `tasks`（`trial: true`）、`changes`）も載せます。explanationOverlay.patterns は試しの計画で、`filtered_tasks` の tasks には混ぜない。`current_schedule` には混ぜない。計画のタスクやバーの色ではない。PNG には半透明、抜き、吹き出し、`summary`、試しのバーを写さない。`open_windows`、`schedule_diff`、`baseline_diffs`、`current_schedule` には `explanationOverlay` を含めない。同じ応答のあとに、同じ .main の PNG を載せます。設定と閉じているメニューは写しません。1 日の幅は渡しません。displayScale の effective は今のウィンドウで効いている倍率である。自動のときは効いている倍率も effective に載せる。colorScheme の effective は今効いている light か dark である。システムに合わせているときは効いている方を載せる）が一度だけ出ます。説明のための絞り込みと折りたたみは、次回起動の記録には残さない。各タスクには、`colorId` があるときだけ `colorId` を載せます。値があるときだけ `fieldValues`（合成キーと値）が出ます。`current_schedule` はスケジュール JSON 全体であり、定義は足しません。繋がりがあるときはルートの `connections` が保存形と同じ位置で入ります。1件以上あるときだけキーがあります。`selected_task`、`selected_tasks`、`filtered_tasks` には載りません。値は各タスクの `fieldValues` と `colorId` にあります。

## MCP が使えるとき

クライアントが MCP を使えるときは、読み取り 7 ツール（`open_windows` を含む）と `replace_schedule` を呼びます。`baseline_diffs` も省きません。このスキルのコマンドは使いません。

## MCP が使えないとき

読み取りは、次の実行ファイルを引数 `--screen` とツール名だけで起動します（背面を読むときは `--window` と `label` を足します）。標準出力は、`schedule_diff` と `baseline_diffs` ではプレーンテキスト、`current_schedule` はスケジュール JSON 全体、`open_windows`・`selected_task`・`selected_tasks`・`filtered_tasks` では JSON です。`selected_task`、`selected_tasks`、`filtered_tasks` で PNG が付くときは、JSON の次の行に一時 PNG のパスが出ます。そのファイルを読んで絵を見ます。`replace_schedule` は引数に `--screen replace_schedule` だけを渡し、スケジュール JSON 全体を標準入力から読みます。成功時は差分テキストを標準出力へ出します。終了コードが 0 以外のときは標準エラーに理由が出ます。

{{SCHEDULE_VIEWER_INVOCATION}}

スケジュールのウィンドウが開いていないとき、前面または指定したウィンドウが応答しないときは失敗します。引数なしの読み取りは前面だけです。指定した `label` で読むときは、そのウィンドウだけです。
