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
- `statuses` の相対パス（任意。書かないときは組み込みの三件のステータス）
- `calendar` の相対パス（任意。書かないときは土日を塗る）
- `colors` の相対パス（任意。書かないときは行の地を塗らない。既にあるときは残す）
- `fieldExtensions` の相対パスの配列（任意。ピン留めした拡張。書かないときはアプリで選んだ拡張を使う）
- `editableFieldExtension` の相対パス（任意。設定ファイルで開いたウィンドウが編集用に一つだけ作る。手で書いてもよい）

パスは設定ファイルからの相対で、絶対パスは不可。`..` は使える。`fieldExtensions` に同じプラグイン ID のファイルを二つ書けない。`editableFieldExtension` と `fieldExtensions` に同じ相対パスは書けない。

## 出力形

```json
{
  "schemaVersion": 1,
  "schedule": "plan.json",
  "members": "team.members.json",
  "statuses": "team.statuses.json",
  "calendar": "jp-2026.calendar.json",
  "colors": "team.colors.json",
  "fieldExtensions": ["risk.fields.json"]
}
```

## 手順

1. 置くフォルダと、そこから見た各 JSON の相対パスを決める
2. `schemaVersion: 1` と `schedule` を書き、必要なら `members`、`statuses`、`calendar`、`colors`、`fieldExtensions`、`editableFieldExtension` を足す
3. `node scripts/validate-workspace.mjs <file>` で検証する
4. エラーがあれば修正して再検証し、通ってからユーザーに渡す

更新は同じファイルを直す。`fieldExtensions` はアプリから書き換えない。編集用を作る・消すときだけ、アプリが `editableFieldExtension` を書く。
