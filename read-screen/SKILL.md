---
name: read-screen
description: >-
  schedule-viewer の前面ウィンドウから、差分・選択・絞り込みを読み取り、未保存のスケジュールを置き換える。
  MCP の schedule_diff / baseline_diffs / selected_task / selected_tasks / filtered_tasks / replace_schedule が使えないときは、同梱のコマンドを使う。
  write-schedule など JSON 作成用スキルとは別である。
---

# read-screen

schedule-viewer の**前面ウィンドウ**と連携するスキルです。画面の状態を読み取り、チャットからの更新を未保存として置き換えます。スケジュール JSON をファイルに書く `write-schedule`、`write-members`、`write-calendar` とは別です。

## 渡すもの（MCP と同じ）

読み取りは、必要なものだけ使います。5 つをまとめて呼ぶ必要はありません。

| 目的 | MCP ツール名 | コマンドの引数 |
| --- | --- | --- |
| 差分テキスト | `schedule_diff` | `--screen schedule_diff` |
| 起点・画面・ファイルの差分と分類 | `baseline_diffs` | `--screen baseline_diffs` |
| 選択が1件のときのタスク（「このタスク」） | `selected_task` | `--screen selected_task` |
| 編集の選択（「これらのタスク」） | `selected_tasks` | `--screen selected_tasks` |
| オンな絞り込みと残るタスク | `filtered_tasks` | `--screen filtered_tasks` |

`selected_tasks` は、選択が1件でも配列で返します。選択が無いときは空の配列です。選択数が不明なときは `selected_tasks` を使います。`selected_task` は、選択がちょうど1件のときだけそのタスクを返し、0件と2件以上は null です。

絞り込みをスキル側でやり直さないでください。画面が使っている条件のまま返します。

## 開いている画面の更新手順

デスクトップ版で schedule-viewer のウィンドウが開いているときは、スケジュール JSON をファイルに上書きせず、次の手順に従います。衝突（`baseline_diffs` の分類が「異なる」「削除と変更」「追加と削除」のいずれか）があるときは、その対応に従い、人の返事の前にスケジュール全体を作らず、`replace_schedule` もファイルへの書き込みもしません。

1. 必要な範囲で `schedule_diff`、`selected_task`、`filtered_tasks` を読み、あわせて `baseline_diffs` を読みます。衝突があるときは、どちらの変更かを `schedule_diff` から判断しません。
2. `write-schedule` の形式で、スケジュール全体を作ります。既存の id は維持します。
3. 置き換える直前に `baseline_diffs` をもう一度読み、分類が先に示したものと違っていたら、置かずに尋ね直します。
4. `replace_schedule` で前面ウィンドウの未保存を置き換えます。ファイルには書きません。
5. 戻った差分テキストを読みます。「差分が大きすぎるため、差分テキストは返せません。」のときは `schedule_diff` を読みます。
6. この更新でよいかを、会話で尋ねます。アプリは確認しません。よい、と言っても保存しません。
7. 保存しません。開いているファイルも、この手順では上書きしません。

置き換えた直後の取り消し（⌘/Ctrl+Z）は、その更新の却下です。人がそのあと画面を直したときは、次に読む差分は、開いているファイルとの差です。エージェントの更新と人の手直しは、同じ未保存として扱います。手直しのあとに更新の前へ戻すには、手直しの分も続けて取り消します。

ファイルを書くのは、次のときだけです。

- アプリが開いていないとき
- ブラウザ版
- 画面が開いていないまま、新しいスケジュールのファイルを作るとき

パスの無いサンプルをデスクトップ版の前面で開いているときは、`replace_schedule` で置き換え、ファイルは作りません。

## MCP が使えるとき

クライアントが MCP を使えるときは、読み取り 5 ツールと `replace_schedule` を呼びます。`baseline_diffs` も省きません。このスキルのコマンドは使いません。

## MCP が使えないとき

読み取りは、次の実行ファイルを引数 `--screen` とツール名だけで起動します。標準出力は、`schedule_diff` と `baseline_diffs` ではプレーンテキスト、`selected_task`・`selected_tasks`・`filtered_tasks` では JSON です。`replace_schedule` は引数に `--screen replace_schedule` だけを渡し、スケジュール JSON 全体を標準入力から読みます。成功時は差分テキストを標準出力へ出します。終了コードが 0 以外のときは標準エラーに理由が出ます。

{{SCHEDULE_VIEWER_INVOCATION}}

スケジュールのウィンドウが開いていないとき、前面のウィンドウが応答しないときは失敗します。ウィンドウが複数あるときは前面だけです。
