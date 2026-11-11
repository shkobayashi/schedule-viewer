# 同じ変更で更新する文書（正本表）

implement-change・cut-release・publish-user-manual は、**この表に従う**とだけ書く。表の複写は [AGENTS.md](../AGENTS.md) に置かない（原則 1）。

| 変えたもの | 同じ変更で更新する文書 |
| --- | --- |
| 画面の挙動、操作、表示 | [external-spec.md](external-spec.md)。手順が変わるときは [getting-started](user-manual/getting-started.md)、[find-by-intent](user-manual/find-by-intent.md)、[tutorial](user-manual/tutorial.md)、[features](user-manual/features.md)。読み方だけ [user-manual.md](user-manual.md)。README の機能説明 [README.md](../README.md) |
| 操作の入口 | [operation-entries.md](operation-entries.md)、[feature-checklist.md](feature-checklist.md)「操作の入口」 |
| コードの境界・operations | [internal-spec.md](internal-spec.md) |
| 機能 ID・チェックリスト行 | [feature-checklist.md](feature-checklist.md) |
| JSON・schemaVersion | [data-format.md](data-format.md)、`docs/*.schema.json`。[update-schedule-schema](../.cursor/skills/update-schedule-schema/SKILL.md)。カレンダー・メンバー・色・workspace は各 write-* スキルと検証を同じ変更で |
| モジュール・状態・Tauri・描画 | [internal-spec.md](internal-spec.md) |
| テスト | [test-spec.md](test-spec.md) |
| 起動・CI・リリース・Pages | [development.md](development.md)。導入 [README.md](../README.md)、[getting-started](user-manual/getting-started.md)。LLM [tutorial](user-manual/tutorial.md)。公開 URL [user-manual.md](user-manual.md) |
| 方針・ロードマップ | [PLANNING.md](PLANNING.md) |
| 段階の手順と記録 | [.cursor/skills/work-phases/SKILL.md](../.cursor/skills/work-phases/SKILL.md) と [agents-phase-log.md](agents-phase-log.md) を同じ変更で揃える |
| エージェント向け Markdown（AGENTS、`docs/agents-*`、`.cursor/rules`、各 SKILL と `references/`） | [test-spec.md](test-spec.md) の node:test 表にケース名を足す。リンクと SKILL の `name` / `description` は `npm run check:agent-docs` |

通常の不具合修正では [PLANNING.md](PLANNING.md) は更新しない。利用者向けリリースでは [CHANGELOG.md](../CHANGELOG.md) も更新する。
