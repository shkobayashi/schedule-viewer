# エージェント向け指示

このリポジトリを調べるときは、ソースを開く前に下の文書を読む。実装や設定を変えたら、同じ作業の中で対応する文書を更新する。文書が古いままの変更は完了にしない。

## 先に読む文書

質問に合う文書だけを読む。広く検索してからソースを開かない。文書に答えがあるときは、ソースを読まない。実装のためにソースが必要なときは、文書で場所を絞ってから、そのファイルだけを開く。

| 知りたいこと | 文書 |
| --- | --- |
| 利用者の操作 | [docs/user-manual.md](docs/user-manual.md) |
| 画面と機能の挙動、機能 ID | [docs/external-spec.md](docs/external-spec.md) |
| スケジュール、メンバー、カレンダーの JSON とアプリデータ | [docs/data-format.md](docs/data-format.md) と `docs/*.schema.json` |
| 構成、状態、Tauri コマンド、描画 | [docs/internal-spec.md](docs/internal-spec.md) |
| 自動テストと手動テスト | [docs/test-spec.md](docs/test-spec.md) |
| 環境構築、起動、CI、リリース、配布用ビルド | [docs/development.md](docs/development.md) |
| 目的、決定事項、経緯、ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |
| 概要と文書の入口 | [README.md](README.md) |

フィールド定義の正本は各 JSON Schema である。挙動の正本はソースコードである。文書とソースが食い違ったときは、ソースに合わせて文書を直す。

## 変更したら文書も更新する

| 変えたもの | 同じ変更で更新する文書 |
| --- | --- |
| 画面の挙動、操作、表示 | [docs/external-spec.md](docs/external-spec.md)。利用者の手順が変わるときは [docs/user-manual.md](docs/user-manual.md)。README の機能説明が変わるときは [README.md](README.md) |
| JSON のフィールドや `schemaVersion` | [docs/data-format.md](docs/data-format.md) と対応する `docs/*.schema.json`。スケジュール JSON は [.cursor/skills/update-schedule-schema/SKILL.md](.cursor/skills/update-schedule-schema/SKILL.md) の手順で、検証、サンプル、`write-schedule` スキルも揃える。カレンダーとメンバーも、スキーマ、アプリの検証、対応するスキルを同じ変更で揃える |
| モジュール構成、状態、Tauri コマンド、描画の流れ | [docs/internal-spec.md](docs/internal-spec.md) |
| テストの追加、削除、または対応する機能 ID | [docs/test-spec.md](docs/test-spec.md) |
| 起動手順、依存バージョン、CI、リリース、配布 | [docs/development.md](docs/development.md)。利用者向けの導入が変わるときは [README.md](README.md) と [docs/user-manual.md](docs/user-manual.md) |
| 方針、決定事項、ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |

通常の不具合修正では [docs/PLANNING.md](docs/PLANNING.md) は更新しない。利用者に見える変更をリリースへ入れるときは [CHANGELOG.md](CHANGELOG.md) も更新する。
