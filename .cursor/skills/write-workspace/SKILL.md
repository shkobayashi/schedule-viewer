---
name: write-workspace
description: >-
  Creates or updates schedule-viewer workspace JSON that points to schedule,
  members, and calendar files with relative paths. Use when sharing a project
  folder or wiring write-schedule to a fixed schedule path without the app.
---

# write-workspace（schedule-viewer 用設定ファイル）

スケジュール、メンバー、稼働日カレンダーを相対パスでまとめる `workspace.json` を作る。この Skill フォルダだけコピーして使える。ファイルのコピーはしない。パスだけを書く。

## 参照

- 形式の正本: [workspace.schema.json](workspace.schema.json)
- 検証: `node scripts/validate-workspace.mjs <path/to/workspace.json>`

## 入力が揃っていること

- `schedule` の相対パス（必須）
- `members` の相対パス（任意。書かないときはアプリでメンバー未選択）
- `calendar` の相対パス（任意。書かないときは土日を塗る）

パスは設定ファイルからの相対で、絶対パスは不可。`..` は使える。

## 出力形

```json
{
  "schemaVersion": 1,
  "schedule": "plan.json",
  "members": "team.members.json",
  "calendar": "jp-2026.calendar.json"
}
```

## 手順

1. 置くフォルダと、そこから見た各 JSON の相対パスを決める
2. `schemaVersion: 1` と `schedule` を書き、必要なら `members` と `calendar` を足す
3. `node scripts/validate-workspace.mjs <file>` で検証する
4. エラーがあれば修正して再検証し、通ってからユーザーに渡す

更新は同じファイルを直す。アプリからは書き戻さない。
