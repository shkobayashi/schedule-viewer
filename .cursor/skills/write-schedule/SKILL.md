---
name: write-schedule
description: >-
  Creates or updates schedule JSON for schedule-viewer (WBS/Gantt viewer).
  Use when the user asks to write スケジュール JSON, schedule-viewer 用 JSON,
  ガント用データ, or to export tasks/milestones into the schedule-viewer format.
---

# write-schedule（schedule-viewer 用 JSON）

別プロジェクトのタスク管理情報から、schedule-viewer が読める単一 JSON を作る。この Skill フォルダだけコピーして使える。

## 参照

- 形式の正本: [schedule.schema.json](schedule.schema.json)
- 検証: `node scripts/validate-schedule.mjs <path/to/schedule.json>`

## 入力が揃っていること

次が決まっている（または既存 JSON にある）こと。足りないときは **JSON を書かず**、不足項目をユーザーに返す。

- プロジェクト `title`
- `milestones`: 各 `name`, `date`（新規なら `id` は UUID v4）
- `categories` → `groups` → `tasks` の階層と並び（並び替えフィールドはない。配列順＝画面の並び）
- 各タスク: `name`, `start`, `end`, `assignee`（未割当は `""`）, `status`, `progress`, `predecessors`, `milestoneId`（なしは `null`）

日付・担当・期間を推測で埋めない。

## 出力形

```json
{
  "schemaVersion": 1,
  "title": "プロジェクト名",
  "milestones": [{ "id": "<uuid>", "name": "...", "date": "YYYY-MM-DD" }],
  "categories": [{
    "name": "カテゴリ",
    "groups": [{
      "name": "グループ",
      "tasks": [{
        "id": "<uuid>",
        "name": "...",
        "start": "YYYY-MM-DD",
        "end": "YYYY-MM-DD",
        "assignee": "担当者名または空文字",
        "status": "not-started",
        "progress": 0,
        "predecessors": [],
        "milestoneId": null
      }]
    }]
  }]
}
```

- `status`: `not-started` | `in-progress` | `done`
- `progress`: 0〜100 の整数
- `predecessors`: 先行タスクの `id` の配列（後続は各タスクの `predecessors` から導かれる）
- タスク期間は **終了日が開始日より後**（1 日以上）
- タスク ID とマイルストン ID は文書内で重複しない UUID

## 手順

1. 入力をカテゴリ・グループ・タスクの木に整理する（WBS のまま写す）
2. 新規要素には `crypto.randomUUID()` 相当の UUID v4 を付与する。既存 JSON を更新する場合は既存 `id` を維持する
3. `schemaVersion: 1` を付ける
4. JSON ファイルを書き、`node scripts/validate-schedule.mjs` で検証する
5. エラーがあれば修正して再検証し、通ってからユーザーに渡す

## 画面にないものは入れない

フィルタ、折りたたみ、ズーム、系統表示など UI 状態は JSON に含めない。
