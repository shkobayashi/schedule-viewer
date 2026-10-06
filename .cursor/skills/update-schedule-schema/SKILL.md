---
name: update-schedule-schema
description: >-
  Updates schedule-viewer schedule JSON schema and keeps app validation,
  sample data, and write-schedule skill in sync. Use when changing
  docs/schedule.schema.json, schemaVersion, or schedule document fields.
---

# update-schedule-schema（schedule-viewer リポジトリ専用）

スケジュール JSON の形を変えるとき、関連ファイルを同じ変更で揃える。

## 触るファイル

| 役割 | パス |
|------|------|
| スキーマ正本 | [docs/schedule.schema.json](../../../docs/schedule.schema.json) |
| 型 | [src/model/types.ts](../../../src/model/types.ts) |
| 意味規則（アプリ） | [src/model/scheduleSemantics.ts](../../../src/model/scheduleSemantics.ts) |
| Ajv 検証 | [src/model/validateSchedule.ts](../../../src/model/validateSchedule.ts) |
| サンプル | [src/sample/schedule.ts](../../../src/sample/schedule.ts), [src/sample/ids.ts](../../../src/sample/ids.ts) |
| 持ち出し Skill のスキーマコピー | [.cursor/skills/write-schedule/schedule.schema.json](../write-schedule/schedule.schema.json) |
| 持ち出し Skill の検証 | [.cursor/skills/write-schedule/scripts/validate-schedule.mjs](../write-schedule/scripts/validate-schedule.mjs) |
| データ仕様 | [docs/data-format.md](../../../docs/data-format.md) |
| 外部仕様 | [docs/external-spec.md](../../../docs/external-spec.md)（画面の見え方が変わるとき） |
| この Skill | [.cursor/skills/write-schedule/SKILL.md](../write-schedule/SKILL.md)（フィールド説明が変わるとき） |

## 手順

1. 画面が実際に読むフィールドだけをスキーマに足す／変える（UI 専用の状態は入れない）
2. 破壊的変更なら `schemaVersion` を上げ、`SCHEDULE_SCHEMA_VERSION` とスキーマの `const` を一致させる
3. `scheduleSemantics.ts` と `validate-schedule.mjs` の意味規則を同じ内容にする
4. `docs/schedule.schema.json` を `write-schedule/schedule.schema.json` にコピーする
5. サンプルデータと `scheduleToJson` の出力を更新する
6. リポジトリで `npm run check:schedule` を実行し、成功するまで直す
7. 必要なら `node .cursor/skills/write-schedule/scripts/validate-schedule.mjs <一時json>` でも同じサンプルを検証する
8. [docs/data-format.md](../../../docs/data-format.md) を変更内容に合わせて更新する。画面の見え方が変わるときは [docs/external-spec.md](../../../docs/external-spec.md) も直す
9. 移行で新しい ID を付けるときは、意味規則が重複を禁じる ID をすべて避ける。対象はカテゴリ、グループ、タスク、マイルストン、マイルストングループである

## 完了条件

- `npm run build` が通る
- `npm run check:schedule` が通る
- 持ち出し用 `validate-schedule.mjs` が同じサンプル JSON で OK になる
