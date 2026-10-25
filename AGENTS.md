# エージェント向け指示

このリポジトリを調べるときは、ソースを開く前に下の文書を読む。実装や設定を変えたら、同じ作業の中で対応する文書を更新する。文書が古いままの変更は完了にしない。

## 先に読む文書

質問に合う文書だけを読む。広く検索してからソースを開かない。文書に答えがあるときは、ソースを読まない。実装のためにソースが必要なときは、文書で場所を絞ってから、そのファイルだけを開く。

| 知りたいこと | 文書 |
| --- | --- |
| 利用者の操作 | [docs/user-manual.md](docs/user-manual.md)（読み方）。手順は [はじめに](docs/user-manual/getting-started.md)、[チュートリアル](docs/user-manual/tutorial.md)、[全機能](docs/user-manual/features.md) |
| 画面と機能の挙動、機能 ID | [docs/external-spec.md](docs/external-spec.md) |
| スケジュール、メンバー、カレンダーの JSON とアプリデータ | [docs/data-format.md](docs/data-format.md) と `docs/*.schema.json` |
| 構成、状態、Tauri コマンド、描画 | [docs/internal-spec.md](docs/internal-spec.md) |
| 自動テストと手動テスト | [docs/test-spec.md](docs/test-spec.md) |
| 環境構築、起動、CI、リリース、配布用ビルド | [docs/development.md](docs/development.md) |
| 1.x を出しながら次のメジャーを進めるブランチ | [docs/development.md](docs/development.md)（1.x を出しながら次のメジャーを進める）。実装は implement-change、`next` を切る作業とリリースは cut-release |
| 目的、決定事項、経緯、ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |
| 概要と文書の入口 | [README.md](README.md) |
| 計画に沿ってアプリを実装する | [.cursor/skills/implement-change/SKILL.md](.cursor/skills/implement-change/SKILL.md) |
| リリース、CI、配布用ビルド | [.cursor/skills/cut-release/SKILL.md](.cursor/skills/cut-release/SKILL.md) |
| 操作マニュアルの GitHub Pages 公開 | [.cursor/skills/publish-user-manual/SKILL.md](.cursor/skills/publish-user-manual/SKILL.md) |
| プロジェクト全体をレビューする | [.cursor/skills/review-project/SKILL.md](.cursor/skills/review-project/SKILL.md) |
| 計画を実装したあとのレビュー | [.cursor/skills/review-implementation/SKILL.md](.cursor/skills/review-implementation/SKILL.md) |
| 日本語の文章の書き方 | [.cursor/rules/japanese-prose.mdc](.cursor/rules/japanese-prose.mdc) |

フィールド定義の正本は各 JSON Schema である。挙動の正本はソースコードである。文書とソースが食い違ったときは、ソースに合わせて文書を直す。

## 変更したら文書も更新する

| 変えたもの | 同じ変更で更新する文書 |
| --- | --- |
| 画面の挙動、操作、表示 | [docs/external-spec.md](docs/external-spec.md)。利用者の手順が変わるときは、内容に合う [docs/user-manual/getting-started.md](docs/user-manual/getting-started.md)、[docs/user-manual/tutorial.md](docs/user-manual/tutorial.md)、[docs/user-manual/features.md](docs/user-manual/features.md)。読み方だけ変えるときは [docs/user-manual.md](docs/user-manual.md)。README の機能説明が変わるときは [README.md](README.md) |
| JSON のフィールドや `schemaVersion` | [docs/data-format.md](docs/data-format.md) と対応する `docs/*.schema.json`。スケジュール JSON は [.cursor/skills/update-schedule-schema/SKILL.md](.cursor/skills/update-schedule-schema/SKILL.md) の手順で、検証、サンプル、`write-schedule` スキルも揃える。カレンダーは `write-calendar`、メンバーは `write-members`、設定ファイルは `write-workspace` を、スキーマとアプリの検証と同じ変更で揃える |
| モジュール構成、状態、Tauri コマンド、描画の流れ | [docs/internal-spec.md](docs/internal-spec.md) |
| テストの追加、削除、または対応する機能 ID | [docs/test-spec.md](docs/test-spec.md) |
| 起動手順、依存バージョン、CI、リリース、配布、操作マニュアルの Pages | [docs/development.md](docs/development.md)。利用者向けの導入が変わるときは [README.md](README.md) と [docs/user-manual/getting-started.md](docs/user-manual/getting-started.md)（入手と起動）。LLM 連携の流れが変わるときは [docs/user-manual/tutorial.md](docs/user-manual/tutorial.md)。公開 URL が変わるときは [docs/user-manual.md](docs/user-manual.md) |
| 方針、決定事項、ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |

通常の不具合修正では [docs/PLANNING.md](docs/PLANNING.md) は更新しない。利用者に見える変更をリリースへ入れるときは [CHANGELOG.md](CHANGELOG.md) も更新する。

## Issue

GitHub の Issue を見る、コメントする、作る、更新するときは、gh を使う。

## 個人の学習

会話から残す個人の好みと、このマシンだけの作業事実は、`.cursor/rules/personal.local.mdc` に書く。`AGENTS.md` には `Learned User Preferences` と `Learned Workspace Facts` を足さない。学習の実行状態は `.cursor/hooks/state/` に置く。この二つは Git に含めない。

## スキルの使い方と保守

計画を書いて実装に渡すときは、実装が読むスキル名と、その中の節を計画に書く。アプリの実装（画面、状態、モデル、Tauri、描画と、それに伴う文書とテスト）は [implement-change](.cursor/skills/implement-change/SKILL.md)、リリース、CI、配布用ビルドは [cut-release](.cursor/skills/cut-release/SKILL.md)、操作マニュアルの GitHub Pages は [publish-user-manual](.cursor/skills/publish-user-manual/SKILL.md)、プロジェクト全体のレビューは [review-project](.cursor/skills/review-project/SKILL.md)、計画を実装したあとのレビューは [review-implementation](.cursor/skills/review-implementation/SKILL.md) である。スケジュール、メンバー、カレンダーの JSON を作るときは `write-schedule`、`write-members`、`write-calendar`。同じフォルダを `workspace.json` で束ねるときは `write-workspace`。スケジュール JSON の形を変えるときは `update-schedule-schema`。

1.x を出しながら次のメジャーを進める手順は [docs/development.md](docs/development.md) にある。この作業用のスキルは作らない。実装の計画は implement-change だけを読み、載せるブランチは着手前で決める。`next` を切る作業と次メジャーのリリースは、cut-release の「1.x と次のメジャー」を読む。

計画を実装する前に、計画が名指ししたスキルの `SKILL.md` を読む。名指しが無いときは、`description` がこの作業に合うスキルを1つ読む。`implement-change` は、指定された節と、節の指定にかかわらず「着手前」を読む。

日本語の文章の書き方は [.cursor/rules/japanese-prose.mdc](.cursor/rules/japanese-prose.mdc) に従う。

仕様や方向の相談は、利用者が `/consult` または「相談モード」で始めたときに [.cursor/rules/consult.mdc](.cursor/rules/consult.mdc) に従う。返し方と終わりの条件はこのルールにある。[.cursor/skills/consult/SKILL.md](.cursor/skills/consult/SKILL.md) は `/consult` で始めるための入口である。

スキルの作成、本文の更新、分割してよいかの判断は、エージェントが同じ作業の中で行う。

スキルやルールの本文からほかのファイルへリンクするときは、そのファイルからの相対パスで書く。たとえば SKILL.md から `AGENTS.md` へは `../../../AGENTS.md` と書く。

計画を実装したあとのレビューは [review-implementation](.cursor/skills/review-implementation/SKILL.md) に従い、その場ではファイルを直さない。計画と仕上がりがずれた箇所を直すときは、再発を防ぐ手順を該当スキルの該当する節へ同じ変更で必ず足す。足した節を結果に書く。足さない判断だけを書いて完了にしない。その計画だけの指摘は足さない。`write-schedule`、`write-members`、`write-calendar`、`write-workspace` は他のリポジトリへコピーして使うので、アプリ実装の手順はそこへ書かない。

ある種類の計画で、既存スキルの手順のうち使わないものが半分を超えるときは、その種類用のスキルに分ける。リリース、CI、配布用ビルドは、画面の実装と手順が重ならなくなったときに分ける。スキーマの変更は `update-schedule-schema` のままにする。毎回の計画が実装用スキルを2つ読めとしているときは、1つに戻す。
