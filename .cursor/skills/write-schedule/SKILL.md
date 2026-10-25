---
name: write-schedule
description: >-
  Creates schedule JSON files for schedule-viewer (WBS/Gantt viewer). Writes a
  file only for a new schedule, when the desktop app is not running, or when
  the user explicitly asks to write a file. While the desktop app is running,
  do not write files to update an open schedule; use MCP replace_schedule with
  this skill's output shape instead. Use for スケジュール JSON, schedule-viewer 用
  JSON, ガント用データ, or exporting tasks/milestones into the schedule-viewer format.
---

# write-schedule（schedule-viewer 用 JSON）

別プロジェクトのタスク管理情報から、schedule-viewer が読める単一 JSON を作る。この Skill フォルダだけコピーして使える。

## 参照

- 形式の正本: [schedule.schema.json](schedule.schema.json)
- 検証: `node scripts/validate-schedule.mjs <path/to/schedule.json>`

## 入力が揃っていること

次が決まっている（または既存 JSON にある）こと。足りないときは **JSON を書かず**、不足項目をユーザーに返す。

- プロジェクト `title`
- `milestoneGroups`: 帯の行。各 `id`（UUID v4）と `name`。タスクのカテゴリ・グループとは別
- `milestones`: 各 `name`, `date`, `confidence`（日付を合意したなら `committed`、まだなら `tentative`。新規なら `id` は UUID v4）, `groupId`（`milestoneGroups` のいずれか）
- `categories` → `groups` → `tasks` の階層と並び（並び替えフィールドはない。配列順＝画面の並び）。カテゴリとグループにも `id`（新規なら UUID v4）

- 各タスク: `name`, `start`, `end`, `assigneeId`（未割当は `null`）, `status`, `progress`, `confidence`（日付を合意したなら `committed`、まだなら `tentative`）, `predecessors`, `milestoneId`（なしは `null`）。任意で `tags`（説明用タグの配列。ユーザーから渡されたときだけ書く）, `note`（補足説明。ユーザーから渡されたときだけ書く）
- タスクとマイルストンの `confidence` が入力から分からなければ、JSON を書かず不足として返す。未確定を既定にしない
- `status` には、ユーザーから渡された **ステータス一覧** の `id` だけを使う。一覧は次の順で探す。(1) 設定ファイルに `statuses` のパスがあるときは、その JSON を読み、各項目の `id`、`name`、`closed`、`description` を使う。(2) 無いときは、起動中のデスクトップ版の MCP 読み取り（`selected_task`、`selected_tasks`、`filtered_tasks`）の応答の先頭にある `statuses`。(3) どちらも無いときだけ、下の組み込みの三件（`not-started` 未着手、`in-progress` 着手済みで未完、`done` 終わった）から選ぶ。`description` を読んで、タスクの状態に合う項目を選ぶ。`closed` が `true` の項目は完了として扱われる
- 合う項目が一覧に無いときは、`id` を作らず、JSON を書かずに不足として返す。項目の追加は、ユーザーが頼んだときだけ提案する（設定の「ステータス」で足す）
- 担当を付けるタスクには、ユーザーから渡された **メンバー id 一覧** に含まれる id だけを使う。一覧に無い人がいる場合は JSON を書かず、不足として返す

日付・担当・期間を推測で埋めない。メンバー JSON ファイル自体はこの Skill では生成しない（`write-members` で作り、アプリ側で取り込む）。

## 出力形

```json
{
  "schemaVersion": 8,
  "title": "プロジェクト名",
  "milestoneGroups": [{ "id": "<uuid>", "name": "マイルストン" }],
  "milestones": [{ "id": "<uuid>", "name": "...", "date": "YYYY-MM-DD", "confidence": "committed", "groupId": "<milestone-group-uuid>" }],
  "categories": [{
    "id": "<uuid>",
    "name": "カテゴリ",
    "groups": [{
      "id": "<uuid>",
      "name": "グループ",
      "tasks": [{
        "id": "<uuid>",
        "name": "...",
        "start": "YYYY-MM-DD",
        "end": "YYYY-MM-DD",
        "assigneeId": "member-id-or-null",
        "status": "not-started",
        "progress": 0,
        "confidence": "committed",
        "predecessors": [],
        "milestoneId": null
      }]
    }]
  }]
}
```

- `status`: ステータス一覧の `id`（上の規則）。一覧が無いときは `not-started` | `in-progress` | `done`
- `progress`: 0〜100 の整数
- `confidence`: タスクとマイルストンの `tentative`（未確定）| `committed`（確定）。着手や進捗とは独立。日付を合意したかどうかが分からなければ書かない
- `predecessors`: 先行タスクの `id` の配列（後続は各タスクの `predecessors` から導かれる）
- タスク期間は **終了日を含む**（`end` は開始日以降。1 日だけなら `start` と `end` を同じ日にする）
- カテゴリ、グループ、タスク、マイルストン、マイルストングループの ID は文書内で重複しない UUID。カテゴリ名は文書内で重複しない。グループ名は同じカテゴリの中で重複しない。マイルストングループの名前は、その中で重複しない
- `assigneeId` はメンバー一覧の `id`（UUID である必要はない）
- `tags` はユーザーから渡されたタグがあるときだけタスクに足す。各要素は1文字以上。空文字や空白だけは含めず、0件ならプロパティ自体を書かない
- `note` はユーザーから渡された補足があるときだけタスクに足す。空文字や空白だけはプロパティ自体を書かない

## 設定ファイル（workspace.json）があるとき

設定ファイルは `schemaVersion: 1` で、必須の `schedule` にスケジュール JSON への**相対パス**を書く。任意で `members`、`statuses`、`calendar` に相対パスを書く。形の正本は次のとおり。

```json
{
  "schemaVersion": 1,
  "schedule": "plan.json",
  "members": "team.members.json",
  "statuses": "team.statuses.json",
  "calendar": "jp-2026.calendar.json"
}
```

設定ファイルのパスが渡されたときは、`schedule` の相対パスを**スケジュールの書き先**にする。`members` があるときは、そのファイルを読み、各 `id` を担当の一覧にする。`statuses` があるときは、そのファイルを読み、各項目の `id` だけをステータスに使う。意味は JSON の `description` にあり、スキル本文には足さない。`statuses` が無いときは組み込みの三件を使う。アプリの起動も、アプリへの取り込みも要らない。`members` が無い状態で担当を付ける依頼は、JSON を書かず不足として返す。`calendar` のパスはスケジュール JSON には使わない。日付の前後はアプリが計算するため、カレンダーを読んで日付を動かさない。

## 手順

依頼を次のどれかに分ける。特別な指示が無い限り、ファイルを書くのは **新しいスケジュールファイルを作る**、**デスクトップ版が起動していない**（ブラウザ版も同じ）、**人がファイルへ書くと明示した**、または**設定ファイルが指すスケジュールを書く** のときだけである。

- **新規ファイル**: 起動中でも新しい JSON ファイルを書く。開いている画面は置き換えない
- **設定ファイル経由**: 設定ファイルの `schedule` 先を書く。検証は手順 4 と同じ
- **起動中の更新**: デスクトップ版が起動していて、開いているスケジュールを変える依頼は、このスキルではファイルを書かない。出力形と入力条件だけを使い、MCP の `replace_schedule` へ渡す。MCP を呼べないときは `read-screen` の画面連携の手順に従う。`write-schedule` のファイルを書く手順（手順 4 の検証付き書き込み）は実行しない
- **未起動・明示のファイル書き**: 上記のどちらでもないときは、JSON ファイルを書き、検証する

`baseline_diffs` で衝突と判定されたときは、その対応に従い、人の返事の前にスケジュール全体を作らない。

1. 入力をカテゴリ・グループ・タスクの木に整理する（WBS のまま写す）
2. 新規のカテゴリ、グループ、タスク、マイルストン、マイルストングループには `crypto.randomUUID()` 相当の UUID v4 を付与する。既存 JSON を更新する場合は既存 `id` を維持する
3. `schemaVersion: 8` を付ける
4. **新規ファイル**、**未起動・明示のファイル書き** のときだけ、JSON ファイルを書き、このスキルフォルダで `node scripts/validate-schedule.mjs <file>` を実行して検証する。**起動中の更新** のときはファイルを書かず、検証用に一時ファイルを使っても、開いているファイルは上書きしない
5. エラーがあれば修正して再検証し、通ってからユーザーに渡す（起動中の更新では、検証済み JSON を `replace_schedule` に渡す）

## 画面にないものは入れない

フィルタ、折りたたみ、ズーム、系統表示など UI 状態は JSON に含めない。
