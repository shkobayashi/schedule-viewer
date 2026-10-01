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
| 計画に沿ってアプリを実装する | [.cursor/skills/implement-change/SKILL.md](.cursor/skills/implement-change/SKILL.md) |
| プロジェクト全体をレビューする | [.cursor/skills/review-project/SKILL.md](.cursor/skills/review-project/SKILL.md) |

フィールド定義の正本は各 JSON Schema である。挙動の正本はソースコードである。文書とソースが食い違ったときは、ソースに合わせて文書を直す。

## 変更したら文書も更新する

| 変えたもの | 同じ変更で更新する文書 |
| --- | --- |
| 画面の挙動、操作、表示 | [docs/external-spec.md](docs/external-spec.md)。利用者の手順が変わるときは [docs/user-manual.md](docs/user-manual.md)。README の機能説明が変わるときは [README.md](README.md) |
| JSON のフィールドや `schemaVersion` | [docs/data-format.md](docs/data-format.md) と対応する `docs/*.schema.json`。スケジュール JSON は [.cursor/skills/update-schedule-schema/SKILL.md](.cursor/skills/update-schedule-schema/SKILL.md) の手順で、検証、サンプル、`write-schedule` スキルも揃える。カレンダーは `write-calendar`、メンバーは `write-members` を、スキーマとアプリの検証と同じ変更で揃える |
| モジュール構成、状態、Tauri コマンド、描画の流れ | [docs/internal-spec.md](docs/internal-spec.md) |
| テストの追加、削除、または対応する機能 ID | [docs/test-spec.md](docs/test-spec.md) |
| 起動手順、依存バージョン、CI、リリース、配布 | [docs/development.md](docs/development.md)。利用者向けの導入が変わるときは [README.md](README.md) と [docs/user-manual.md](docs/user-manual.md) |
| 方針、決定事項、ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |

通常の不具合修正では [docs/PLANNING.md](docs/PLANNING.md) は更新しない。利用者に見える変更をリリースへ入れるときは [CHANGELOG.md](CHANGELOG.md) も更新する。

## スキルの使い方と保守

計画を書いて実装に渡すときは、実装が読むスキル名と、その中の節を計画に書く。アプリの実装（画面、状態、モデル、Tauri、描画と、それに伴う文書とテスト）は [implement-change](.cursor/skills/implement-change/SKILL.md)、プロジェクト全体のレビューは [review-project](.cursor/skills/review-project/SKILL.md) である。スケジュール、メンバー、カレンダーの JSON を作るときは `write-schedule`、`write-members`、`write-calendar`。スケジュール JSON の形を変えるときは `update-schedule-schema`。

計画を実装する前に、計画が名指ししたスキルの `SKILL.md` を読む。名指しが無いときは、`description` がこの作業に合うスキルを1つ読む。`implement-change` は、指定された節と、節の指定にかかわらず「着手前」を読む。

スキルの作成、本文の更新、分割してよいかの判断は、エージェントが同じ作業の中で行う。

実装のレビューで直したときも、プロジェクト全体のレビューと同じである。完了前に、別の計画でも同じ手順で守るものがあるかを判断する。あるときは、該当スキルの該当する節へ手順として一行足す。無いときは、結果にその判断を書く。その計画だけの指摘は足さない。`write-schedule`、`write-members`、`write-calendar` は他のリポジトリへコピーして使うので、アプリ実装の手順はそこへ書かない。

ある種類の計画で、既存スキルの手順のうち使わないものが半分を超えるときは、その種類用のスキルに分ける。リリース、CI、配布用ビルドは、画面の実装と手順が重ならなくなったときに分ける。スキーマの変更は `update-schedule-schema` のままにする。毎回の計画が実装用スキルを2つ読めとしているときは、1つに戻す。
