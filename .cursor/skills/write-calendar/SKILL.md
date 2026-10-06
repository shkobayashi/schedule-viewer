---
name: write-calendar
description: >-
  Creates or updates working-day calendar JSON for schedule-viewer (non-working
  day display). Use when the user asks for 稼働日カレンダー, 休日カレンダー,
  calendar JSON for schedule-viewer, or non-working days to import in app settings.
---

# write-calendar（schedule-viewer 用稼働日カレンダー）

schedule-viewer の設定から取り込む、非稼働日表示専用の JSON を作る。この Skill フォルダだけコピーして使える。スケジュール JSON には含めない。

## 参照

- 形式の正本: [calendar.schema.json](calendar.schema.json)
- 検証: `node scripts/validate-calendar.mjs <path/to/calendar.json>`

## 入力が揃っていること

次が決まっている（または既存 JSON にある）こと。足りないときは **JSON を書かず**、不足項目をユーザーに返す。

- 対象期間（何年分・何月から何月までなど）
- `weekends`: 曜日で休む日（`sun`〜`sat` の配列）。未指定のまま勝手に `sat`/`sun` にしない。ユーザーに確認する
- `nonWorkingDays`: 祝日・会社休業など、日付で指定する休日（各 `date`、任意で `name`）
- `workingDays`: 振替出勤など、休日扱いの曜日でも稼働する日（各 `date`、任意で `name`）

国民の祝日・会社カレンダー・振替休日を **推測で埋めない**。ユーザーまたは信頼できる資料から渡された日付だけを書く。

## 出力形

```json
{
  "schemaVersion": 1,
  "weekends": ["sat", "sun"],
  "nonWorkingDays": [{ "date": "2026-01-01", "name": "元日" }],
  "workingDays": [{ "date": "2026-02-23", "name": "振替出勤" }]
}
```

- `schemaVersion`: 常に `1`
- `weekends` / `nonWorkingDays` / `workingDays` はすべて必須（空配列可）
- `date` は実在する `YYYY-MM-DD`。同じ日付を `nonWorkingDays` と `workingDays` の両方に書かない
- 各配列内で `date` を重複させない
- `name` はファイル内メモ用。チャートには表示されない

## 非稼働日の意味（アプリ側）

`workingDays` にある日は稼働。それ以外で `nonWorkingDays` にある日、または `weekends` の曜日に当たる日は非稼働として薄く塗る。タスクの期間計算やバー移動はアプリでは行わない。

## 手順

1. ユーザーから期間・週末の扱い・休日一覧・振替出勤を整理する
2. 既存 JSON を更新する場合は既存の日付エントリを維持しつつ差分を足す
3. `schemaVersion: 1` を付け、3 つの配列をすべて含める
4. このスキルフォルダで `node scripts/validate-calendar.mjs <file>` を実行して検証する
5. エラーがあれば修正して再検証し、通ってからユーザーに渡す

## 画面にないものは入れない

タイムラインのズーム、フィルタ、スケジュールのタスクなど UI 状態や WBS データはこの JSON に含めない。
