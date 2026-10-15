---
name: read-screen
description: >-
  schedule-viewer の前面ウィンドウから、差分・選択中のタスク・絞り込み結果を読み取る。
  MCP の schedule_diff / baseline_diffs / selected_task / selected_tasks / filtered_tasks が使えないときは、同梱のコマンドを使う。
  write-schedule など JSON 作成用スキルとは別である。
---

# read-screen

schedule-viewer の**画面の状態**を LLM に渡すためのスキルです。スケジュール JSON を作る `write-schedule`、`write-members`、`write-calendar` とは別です。

## 渡すもの（MCP と同じ）

必要なものだけ使います。5 つをまとめて呼ぶ必要はありません。

| 目的 | MCP ツール名 | コマンドの引数 |
| --- | --- | --- |
| 差分テキスト | `schedule_diff` | `--screen schedule_diff` |
| 起点・画面・ファイルの差分と分類 | `baseline_diffs` | `--screen baseline_diffs` |
| 選択が1件のときのタスク（「このタスク」） | `selected_task` | `--screen selected_task` |
| 編集の選択（「これらのタスク」） | `selected_tasks` | `--screen selected_tasks` |
| オンな絞り込みと残るタスク | `filtered_tasks` | `--screen filtered_tasks` |

`selected_tasks` は、選択が1件でも配列で返します。選択が無いときは空の配列です。選択数が不明なときは `selected_tasks` を使います。`selected_task` は、選択がちょうど1件のときだけそのタスクを返し、0件と2件以上は null です。

絞り込みをスキル側でやり直さないでください。画面が使っている条件のまま返します。

## MCP が使えるとき

クライアントが MCP を使えるときは、上の 5 ツールを呼びます。`baseline_diffs` も省きません。このスキルのコマンドは使いません。

## MCP が使えないとき

次の実行ファイルを、引数 `--screen` とツール名だけで起動します。標準出力は、`schedule_diff` と `baseline_diffs` ではプレーンテキスト、`selected_task`・`selected_tasks`・`filtered_tasks` では JSON です。終了コードが 0 以外のときは標準エラーに理由が出ます。

{{SCHEDULE_VIEWER_INVOCATION}}

スケジュールのウィンドウが開いていないとき、前面のウィンドウが応答しないときは失敗します。ウィンドウが複数あるときは前面だけです。
