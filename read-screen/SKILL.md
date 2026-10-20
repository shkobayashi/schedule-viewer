---
name: read-screen
description: >-
  Replaces the open schedule as unsaved while the schedule-viewer desktop app is
  running, when MCP cannot be called. JSON shape follows write-schedule output;
  does not write files. Use schedule_diff / baseline_diffs / selected_task /
  selected_tasks / filtered_tasks / open_windows / replace_schedule via MCP when
  available, else bundled --screen commands. Not for new schedule files or when
  the app is not running (use write-schedule). Distinct from write-members and
  write-calendar.
---

# read-screen

schedule-viewer のデスクトップ版ウィンドウと連携するスキルです。起動しているとき、開いているスケジュールの更新を未保存として置き換えます。JSON の形は `write-schedule` の出力形に従い、ファイルには書きません。新しいスケジュールファイルの作成、デスクトップ版が起動していないときのファイル作成、`write-members`、`write-calendar` は別です。

## どのウィンドウを読むか

- 利用者の依頼が、特定のファイル名・親フォルダ・「後ろ」「背面」などでウィンドウを指していないときは、**前面ウィンドウ**だけを読みます。`open_windows` は呼びません。読み取りに `window` も付けません。
- ウィンドウやファイルを指しているときは、先に一覧を取り、言い方を一覧へ当ててから読みます。
  - MCP では `open_windows` を呼びます。
  - MCP が使えないときは `--screen open_windows` を実行します。
- 一覧の各要素は `label`（内部ラベル）、`file`（パス末尾。パスが無いときは「サンプルデータ」）、`folder`（親フォルダ名。無いとき null）、`front`（引数なしの読み取りが向くウィンドウだけ true）です。絶対パスは含みません。
- 利用者の省略した言い方（ファイル名の一部、親フォルダ名など）を、`file` と `folder` へ自分で当てます。一意に当たったときだけ、その `label` で読みます。当たらない、または 2 件以上に当たるときは、前面の内容で代用せず、`file`・`folder`・どれが前面かだけを伝えて尋ねます。絶対パスは書きません。
- 「後ろ」「背面」だけでファイル名が無いときは、`front` が false の行が 1 件ならそれを使います。複数なら尋ねます。
- 読み取りで `window` に渡すのは `label` だけです。ファイル名やフォルダ名をそのまま渡しません。
- 読んでも、そのウィンドウは前面にしません。

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

背面のウィンドウを読むときは、MCP では読み取り 5 つに `window` 引数（`open_windows` の `label`）を付けます。MCP が使えないときは `--screen <読み取り> --window <label>` です。`open_windows` と `replace_schedule` に `--window` は付けません。

`selected_tasks` は、選択が1件でも配列で返します。選択が無いときは空の配列です。選択数が不明なときは `selected_tasks` を使います。`selected_task` は、選択がちょうど1件のときだけそのタスクを返し、0件と2件以上は null です。

絞り込みをスキル側でやり直さないでください。画面が使っている条件のまま返します。

## 開いている画面の更新手順

デスクトップ版で schedule-viewer のウィンドウが開いているときは、スケジュール JSON をファイルに上書きせず、次の手順に従います。衝突（`baseline_diffs` の分類が「異なる」「削除と変更」「追加と削除」のいずれか）があるときは、その対応に従い、人の返事の前にスケジュール全体を作らず、`replace_schedule` もファイルへの書き込みもしません。

1. 必要な範囲で `schedule_diff`、`selected_task`、`filtered_tasks` を読み、あわせて `baseline_diffs` を読みます。衝突があるときは、どちらの変更かを `schedule_diff` から判断しません。依頼が特定のウィンドウを指しているときは、上の「どのウィンドウを読むか」に従い、前面以外も読めます。
2. `write-schedule` の出力形と入力条件に従い、スケジュール全体を作ります。既存の id は維持します。`write-schedule` のファイルを書く手順は実行しません。
3. 置き換える直前に `baseline_diffs` をもう一度読み、分類が先に示したものと違っていたら、置かずに尋ね直します。
4. `replace_schedule` で**前面ウィンドウ**の未保存だけを置き換えます。背面のウィンドウは置き換えません。依頼が前面と違うウィンドウの更新だけを指しているときは、置き換えずその旨を伝えます。ファイルには書きません。
5. 戻った差分テキストを読みます。「差分が大きすぎるため、差分テキストは返せません。」のときは `schedule_diff` を読みます。
6. この更新でよいかを、会話で尋ねます。アプリは確認しません。よい、と言っても保存しません。
7. 保存しません。開いているファイルも、この手順では上書きしません。

置き換えた直後の取り消し（⌘/Ctrl+Z）は、その更新の却下です。人がそのあと画面を直したときは、次に読む差分は、開いているファイルとの差です。エージェントの更新と人の手直しは、同じ未保存として扱います。手直しのあとに更新の前へ戻すには、手直しの分も続けて取り消します。

このスキルではファイルを書きません。新しいスケジュールファイルや、デスクトップ版が起動していないときのファイル作成は `write-schedule` を使います。

パスの無いサンプルをデスクトップ版の前面で開いているときは、`replace_schedule` で置き換え、ファイルは作りません。

## MCP が使えるとき

クライアントが MCP を使えるときは、読み取り 6 ツール（`open_windows` を含む）と `replace_schedule` を呼びます。`baseline_diffs` も省きません。ウィンドウの当て方は、このスキルの「どのウィンドウを読むか」と同じです。このスキルのコマンドは使いません。

## MCP が使えないとき

読み取りは、次の実行ファイルを引数 `--screen` とツール名だけで起動します（背面を読むときは `--window` と `label` を足します）。標準出力は、`schedule_diff` と `baseline_diffs` ではプレーンテキスト、`open_windows`・`selected_task`・`selected_tasks`・`filtered_tasks` では JSON です。`replace_schedule` は引数に `--screen replace_schedule` だけを渡し、スケジュール JSON 全体を標準入力から読みます。成功時は差分テキストを標準出力へ出します。終了コードが 0 以外のときは標準エラーに理由が出ます。

{{SCHEDULE_VIEWER_INVOCATION}}

スケジュールのウィンドウが開いていないとき、前面または指定したウィンドウが応答しないときは失敗します。引数なしの読み取りは前面だけです。指定した `label` で読むときは、そのウィンドウだけです。
