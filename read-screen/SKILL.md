---
name: read-screen
description: >-
  schedule-viewer の前面ウィンドウから、差分・選択中のタスク・絞り込み結果を読み取る。
  MCP の schedule_diff / selected_task / filtered_tasks が使えないときは、同梱のコマンドを使う。
  write-schedule など JSON 作成用スキルとは別である。
---

# read-screen

schedule-viewer の**画面の状態**を LLM に渡すためのスキルです。スケジュール JSON を作る `write-schedule`、`write-members`、`write-calendar` とは別です。

## 渡すもの（MCP と同じ）

必要なものだけ使います。3 つをまとめて呼ぶ必要はありません。

| 目的 | MCP ツール名 | コマンドの引数 |
| --- | --- | --- |
| 差分テキスト | `schedule_diff` | `--screen schedule_diff` |
| 選択中のタスク | `selected_task` | `--screen selected_task` |
| オンな絞り込みと残るタスク | `filtered_tasks` | `--screen filtered_tasks` |

絞り込みをスキル側でやり直さないでください。画面が使っている条件のまま返します。

## MCP が使えるとき

クライアントが MCP を使えるときは、上の 3 ツールを呼びます。このスキルのコマンドは使いません。

## MCP が使えないとき

次の実行ファイルを、引数 `--screen` とツール名だけで起動します。標準出力に JSON テキストが出ます。終了コードが 0 以外のときは標準エラーに理由が出ます。

実行ファイル:

{{SCHEDULE_VIEWER_EXECUTABLE}}

例（差分だけ欲しいとき。1行目が実行ファイル、2行目が引数です）:

```
{{SCHEDULE_VIEWER_EXECUTABLE}}
--screen schedule_diff
```

スケジュールのウィンドウが開いていないとき、前面のウィンドウが応答しないときは失敗します。ウィンドウが複数あるときは前面だけです。
