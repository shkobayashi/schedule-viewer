---
name: write-fields
description: >-
  Creates or updates field extension JSON for schedule-viewer (shared custom
  fields). Use when the user asks for 拡張項目, field extension JSON, or shared
  additional fields to import in app settings.
---

# write-fields（schedule-viewer 用拡張項目）

設定から取り込む、複数スケジュールで共有する追加項目の定義 JSON を作る。この Skill フォルダだけコピーして使える。タスクの値は書かない。値のキーは `プラグインID_項目ID` である。

## 参照

- 形式の正本: [field-extensions.schema.json](field-extensions.schema.json)
- 検証: `node scripts/validate-field-extensions.mjs <path/to/extension.json>`

## 入力が揃っていること

- プラグインの `id` と画面の `name`
- 各項目の `id`、`name`、`type`（text / number / date / choice）
- 候補型なら `choices`

`id`（プラグインも項目も）に空白と `_` は使えない。名前から ID を推測しない。

## 出力形

```json
{
  "schemaVersion": 1,
  "id": "risk",
  "name": "リスク管理",
  "fields": [
    { "id": "score", "name": "点数", "type": "number" },
    {
      "id": "lane",
      "name": "区分",
      "type": "choice",
      "choices": ["内製", "外注"]
    }
  ]
}
```

項目の形は、拡張項目 JSON（SET-10）の `fields` 配列に書く。意味、指示、必須、初期値、数値のパーセント表示も書ける。

## 手順

1. プラグイン ID と項目を整理する
2. `schemaVersion: 1` を付け、`id`、`name`、`fields` を書く
3. `node scripts/validate-field-extensions.mjs <file>` で検証する
4. エラーがあれば修正して再検証し、通ってからユーザーに渡す

## 画面にないものは入れない

スケジュールのタスクや `fieldValues`、ワークスペースのパスはこの JSON に書かない。値を書くときは `write-schedule` で `プラグインID_項目ID` を使う。
