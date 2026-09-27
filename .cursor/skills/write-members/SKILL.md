---
name: write-members
description: >-
  Creates or updates member catalog JSON for schedule-viewer (assignee names).
  Use when the user asks for メンバー JSON, メンバー一覧, member catalog for
  schedule-viewer, or assignee ids to import in app settings.
---

# write-members（schedule-viewer 用メンバー一覧）

schedule-viewer の設定から取り込む、担当者の ID と表示名の JSON を作る。この Skill フォルダだけコピーして使える。スケジュール JSON には含めない。

## 参照

- 形式の正本: [members.schema.json](members.schema.json)
- 検証: `node scripts/validate-members.mjs <path/to/members.json>`

## 入力が揃っていること

次が決まっている（または既存 JSON にある）こと。足りないときは **JSON を書かず**、不足項目をユーザーに返す。

- 各メンバーの `id` と `name`
- 既存 JSON を更新するときは、残す人と追加・削除する人

`id` を名前から推測して作らない。ユーザーが ID の付け方を指定したときだけ、その規則で書く。表示名だけが渡され、ID が無い人は不足として返す。

## 出力形

```json
{
  "schemaVersion": 1,
  "members": [
    { "id": "tanaka", "name": "田中" }
  ]
}
```

- `schemaVersion`: 常に `1`
- `members` は必須（空配列可）
- `id` と `name` は1文字以上。空白だけは不可
- `id` は配列内で重複できない。`name` は重複してよい
- `id` は UUID である必要はない。スケジュール JSON の `assigneeId` はこの `id` を参照する

## 手順

1. ユーザーから ID と表示名を整理する
2. 既存 JSON を更新する場合は、残す人の `id` を維持する
3. `schemaVersion: 1` を付け、`members` を含める
4. `node scripts/validate-members.mjs`（リポジトリ内は `.cursor/skills/write-members/scripts/validate-members.mjs`）で検証する
5. エラーがあれば修正して再検証し、通ってからユーザーに渡す

## 画面にないものは入れない

メールアドレス、所属、稼働率、スケジュールのタスクなど、この JSON に無い項目は書かない。
