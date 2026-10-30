---
name: read-screen
description: >-
  Replaces the open schedule as unsaved while the schedule-viewer desktop app is
  running, when MCP cannot be called. JSON shape follows write-schedule output;
  does not write files. Use schedule_diff / baseline_diffs / selected_task /
  selected_tasks / filtered_tasks / current_schedule / open_windows /
  replace_schedule via MCP when
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
| 画面のスケジュール JSON 全体 | `current_schedule` | `--screen current_schedule` |

背面のウィンドウを読むときは、MCP では読み取り 6 つに `window` 引数（`open_windows` の `label`）を付けます。MCP が使えないときは `--screen <読み取り> --window <label>` です。`open_windows` と `replace_schedule` に `--window` は付けません。

`selected_tasks` は、選択が1件でも配列で返します。選択が無いときは空の配列です。選択数が不明なときは `selected_tasks` を使います。`selected_task` は、選択がちょうど1件のときだけそのタスクを返し、0件と2件以上は null です。

絞り込みをスキル側でやり直さないでください。画面が使っている条件のまま返します。

`selected_task`、`selected_tasks`、`filtered_tasks` の応答には、`levels` と `statuses` のあとに `colors`（使用中の色の一覧。一覧が無いときは空の配列）、続けて `members`（メンバー一覧。一覧が無いときは空の配列。空でない `description` がある人だけ `description` も入る）、続けて `fields`（使用中の追加項目の定義。定義が無いときは空の配列）が一度だけ出ます。各タスクには、`colorId` があるときだけ `colorId` を載せます。値があるときだけ `fieldValues`（合成キーと値）が出ます。`current_schedule` はスケジュール JSON 全体であり、定義は足しません。繋がりがあるときはルートの `connections` が保存形と同じ位置で入ります。1件以上あるときだけキーがあります。`selected_task`、`selected_tasks`、`filtered_tasks` には載りません。値は各タスクの `fieldValues` と `colorId` にあります。`colorId` には、色の一覧の id だけを使います。一覧は次の順で探します。設定ファイルに `colors` のパスがあるときはその JSON を読み、各項目の id、name、description、color を使います。起動中でも MCP の一覧は使いません。設定ファイルはあるが `colors` が無いときは、色の id を書きません。設定ファイルが無いときは、読み取り 3 つの応答にある `colors`（`statuses` の次）。それも空なら、色の id を書きません。id は作りません。色を選ぶ材料は一覧の `description` です。`name` と色の値は選ぶ定義にしません。二つの `description` が同じ依頼に合うときは id を選ばず尋ねます。色を付ける依頼では、文に合う項目が一つならその id を書き、どれにも合わないタスクには `colorId` を書かず、既に付いていても外します。二つ以上に合いそうなときは一つに決めず尋ね、答えがあるまでスケジュールを書きません。色の話でない更新では今ある `colorId` を残します。足しも消しもしません。色を外すと頼まれたときだけキーを省きます。一覧に無い id を書いた `colorId` も残します。アプリは文を評価して塗りません。`description` はタスクへコピーしません。`assigneeId` には、メンバー一覧の id だけを使います。一覧は次の順で探します。設定ファイルに `members` のパスがあるときはその JSON を読み、各項目の id、name、空でないときだけ description を使います。起動中でも MCP の一覧は使いません。設定ファイルはあるが `members` が無いとき、担当を付ける依頼は JSON を書かず不足として返します。設定ファイルが無いときは、読み取り 3 つの応答にある `members`（`colors` の次）。それも空なら、担当を付ける依頼は不足として返します。id は作りません。仕事の内容から選ぶときは `description` だけを見ます。表示名は、この選び方には使いません。一つに合う人だけを担当にします。二つ以上に合うときと、どれにも合わないときは尋ね、id は作りません。説明が無い人は、名指しされたときだけ担当に使います。名指しが id か表示名で一人に定まるときは、その id を使います。表示名が二人以上に当たるときは尋ねます。名指しされた人は、説明が別の人に合っていても付け替えません。`description` はタスクへコピーしません。担当は `assigneeId` だけです。

## 繋がり（`connections`）

繋がりはルートの `connections` である。predecessors とは別で、日の前後は見ない。日程は動かさない。色、太さ、ふくらみは JSON に書かない。各要素は `taskIds`（実在タスクの UUID がちょうど2つ。同じ id は不可。並びは方向ではない）と `label`（前後の空白を除いて1文字以上）である。taskIds の順だけが違うときは同じ組である。同じ組は1つだけである。足すのは、その組が無いときだけである。自分自身とは組まない。相手が一つに定まらないとき、言葉が空または空白だけのときは、JSON を書かず理由を返す。言葉を変えるときは、同じ組の `label` だけを変える。組を外すときはその要素を除く。残が0件ならキーを書かない。空配列は書かない。繋がりの話でない更新では、`current_schedule` にある `connections` をそのまま残す。足さないし、消さないし、taskIds の順も変えない。タスクを消すときは、その id を含む繋がりも外す。残ったタスク同士はつなぎ直さない。キーの位置は `milestones` のあと、`categories` または `levels` の前である。この規則は `write-schedule` スキルと `replace_schedule` のツール説明に同じ文言で書く。

## 開いている画面の更新手順

デスクトップ版で schedule-viewer のウィンドウが開いているときは、スケジュール JSON をファイルに上書きせず、次の手順に従います。衝突（`baseline_diffs` の分類が「異なる」「削除と変更」「追加と削除」のいずれか）があるときは、利用者の返事の前にスケジュール全体を作らず、`replace_schedule` もしません。利用者が衝突の採り方を返したあとは、`replace_schedule` で前面の未保存を置き換えます。衝突がある確認だけが開いているときは置き換えられます。画面が変わったときは確認が閉じ、未保存になり、約4秒「画面に反映しました。内容を確認して、問題なければ保存してください。」と出ます。起点と同じ内容だけのときは「画面に反映しました。」と出ます。保存形式が同じで画面が変わらなかったときは確認は閉じません。ファイルには書きません。画面が変わったあとは、内容を確認して問題なければ保存するよう利用者に促します。

1. 必要な範囲で `schedule_diff`、`selected_task`、`filtered_tasks` を読み、あわせて `baseline_diffs` を読みます。スケジュール全体を組み立てるときは `current_schedule` を読みます。衝突があるときは、どちらの変更かを `schedule_diff` から判断しません。依頼が特定のウィンドウを指しているときは、上の「どのウィンドウを読むか」に従い、前面以外も読めます。
2. `write-schedule` の出力形と入力条件に従い、スケジュール全体を作ります。既存の id は維持します。見出しの追加や段の追加も、`write-schedule` の階層の規則に従い、利用者に階層ダイアログを開かせません。`write-schedule` のファイルを書く手順は実行しません。
3. 置き換える直前に `baseline_diffs` をもう一度読み、分類が先に示したものと違っていたら、置かずに尋ね直します。
4. `replace_schedule` で**前面ウィンドウ**の未保存だけを置き換えます。背面のウィンドウは置き換えません。依頼が前面と違うウィンドウの更新だけを指しているときは、置き換えずその旨を伝えます。ファイルには書きません。
5. 戻った差分テキストを読みます。「差分が大きすぎるため、差分テキストは返せません。」のときは `schedule_diff` を読みます。
6. この更新でよいかを、会話で尋ねます。アプリは確認しません。よい、と言っても自動では保存しません。
7. 開いているファイルは、この手順では上書きしません。保存は利用者が行います。衝突をまとめたあとの `replace_schedule` でも同じです。

置き換えた直後の取り消し（⌘/Ctrl+Z）は、その更新の却下です。人がそのあと画面を直したときは、次に読む差分は、開いているファイルとの差です。エージェントの更新と人の手直しは、同じ未保存として扱います。手直しのあとに更新の前へ戻すには、手直しの分も続けて取り消します。

このスキルではファイルを書きません。新しいスケジュールファイルや、デスクトップ版が起動していないときのファイル作成は `write-schedule` を使います。

パスの無いサンプルをデスクトップ版の前面で開いているときは、`replace_schedule` で置き換え、ファイルは作りません。

## MCP が使えるとき

クライアントが MCP を使えるときは、読み取り 7 ツール（`open_windows` を含む）と `replace_schedule` を呼びます。`baseline_diffs` も省きません。ウィンドウの当て方は、このスキルの「どのウィンドウを読むか」と同じです。このスキルのコマンドは使いません。

## MCP が使えないとき

読み取りは、次の実行ファイルを引数 `--screen` とツール名だけで起動します（背面を読むときは `--window` と `label` を足します）。標準出力は、`schedule_diff` と `baseline_diffs` ではプレーンテキスト、`current_schedule` はスケジュール JSON 全体、`open_windows`・`selected_task`・`selected_tasks`・`filtered_tasks` では JSON です。`replace_schedule` は引数に `--screen replace_schedule` だけを渡し、スケジュール JSON 全体を標準入力から読みます。成功時は差分テキストを標準出力へ出します。終了コードが 0 以外のときは標準エラーに理由が出ます。

{{SCHEDULE_VIEWER_INVOCATION}}

スケジュールのウィンドウが開いていないとき、前面または指定したウィンドウが応答しないときは失敗します。引数なしの読み取りは前面だけです。指定した `label` で読むときは、そのウィンドウだけです。
