# エージェント向け指示

このリポジトリでは、**利用者に見える真実は仕様とコードにあり、エージェント向けの長い手順はスキルと internal-spec に置く**。ソースを開く前に文書で場所を絞る。実装や設定を変えたら、同じ作業の中で対応する文書を更新する。文書が古いままの変更は完了にしない。

原則の束ね方と旧メモとの対応は [docs/agents-d0-principles-analysis.md](docs/agents-d0-principles-analysis.md) と [docs/agents-d0-inventory.md](docs/agents-d0-inventory.md)（**D0**。黙って削除しないための old→new 表）にある。

## 原則 1 — 結合された文書（P1）

**変更は、利用者・テスト・CI 表まで同じ PR で届ける。** 正本は JSON Schema（データ形）とソース（挙動）。食い違ったらソースに合わせて文書を直す。

チェック例:

- 触った画面・操作 → [docs/external-spec.md](docs/external-spec.md) と、必要なら [docs/user-manual/](docs/user-manual/)・[README.md](README.md)
- 触ったテスト ID → [docs/test-spec.md](docs/test-spec.md)（表の行を**足す**ときは既存行を落とさない）
- 触った CI・起動 → [docs/development.md](docs/development.md)
- 詳細手順 → [.cursor/skills/implement-change/SKILL.md](.cursor/skills/implement-change/SKILL.md)「文書」「テストと確認」

下の「変更したら文書も更新する」表が具体的な対応一覧である。

## 原則 2 — 依存の向き（P2）

**UI → hooks → model の一方向。model は UI を import しない。循環 import は 0 件。**

チェック例:

- 層の表と import 規則 → [docs/internal-spec.md](docs/internal-spec.md)「コードの境界」
- 循環の CI（**エラー**）→ `npm run check:madge-circular-baseline`（[docs/model-circular-import-plan.md](docs/model-circular-import-plan.md)）
- import 境界 → `npm run lint`
- リファクタで型・走査を切り出すときは **同名モジュールの上書きに注意**（P-AG-04）

## 原則 3 — 操作入口の一致（P3）

**同じ操作 ID は、☰・ショートカット・MCP・右クリックなど、利用者が触る面すべてで同じ集合・対応になる。**

チェック例:

- 手書き正本 → [docs/operation-entries.md](docs/operation-entries.md)
- 影響行 → [docs/feature-checklist.md](docs/feature-checklist.md)「操作の入口」
- 定義のコード → `src/operations/`（実行は hooks）。詳細は internal-spec
- 機械照合 → **未実装**（D2 で `check-operation-entries` 予定、P-CI-06）

## 原則 4 — スコープと計画（P4）

**Issue #490 段 8 は挙動不変の整理。不具合・audit・性能は #491 など別 Issue。** 計画が名指ししたスキルと節だけを実装する。

チェック例:

- 実装手順の正本 → [implement-change](.cursor/skills/implement-change/SKILL.md)（着手前・計画照合）
- 実装後レビュー → [review-implementation](.cursor/skills/review-implementation/SKILL.md)（指摘の再発防止は SKILL か CI へ、**P6**）
- 段 8 の完了順（C/T/M 済、D 進行中）→ Issue #490 / internal-spec

## 原則 5 — 索引と移動（P5）

**AGENTS は短い原則と索引。削る・短くするときは移動先と [agents-d0-inventory.md](docs/agents-d0-inventory.md) の対応表（削除 0）。**

チェック例:

- 個人の好み・マシン固有 → `.cursor/rules/personal.local.mdc`（Git に含めない）
- `write-schedule` 等 JSON スキル → 他リポジトリ向け。**アプリ実装手順は implement-change へ書かない**
- スキルリンクは SKILL から `../../../AGENTS.md` のように相対パス
- 日本語 → [japanese-prose.mdc](.cursor/rules/japanese-prose.mdc)。相談 → [consult.mdc](.cursor/rules/consult.mdc)（`/consult` 時は [consult/SKILL.md](.cursor/skills/consult/SKILL.md)）
- Cloud Agent: **マージ済み PR ブランチへ push しない**（新ブランチ。D1 で development へ明記予定）

## 原則 6 — 落とし穴を止める（P6）

**一度問題になったパターンは、CI・テスト・SKILL のチェックのどれかで止める。** UI/Konva/起動/MCP/Windows の具体条項は implement-change に番号付きで残す（削らない）。

チェック例:

| 種類 | 既にあるガード |
| --- | --- |
| MCP 名 | `npm run check:mcp-tool-names` |
| MCP/read-screen 共有句 | Rust テスト（`MCP_VIEW_IN_READ_TOOLS` 等） |
| model 純関数 | `src/model/*.test.ts` |
| DOM 特性 | `src/**/*.test.tsx`（Vitest jsdom） |
| Rust | `cargo clippy -- -D warnings`、`cargo test --locked` |
| 重複 clone 警告 | `npm run check:architecture-warn`（jscpd） |
| レビューで test-spec 行落ち | **D2** review チェックリスト（P-AG-02） |

テーマ別索引 → [agents-d0-principles-analysis.md](docs/agents-d0-principles-analysis.md) §「implement-change 番号 → 原則」。

## 先に読む文書

質問に合う文書だけを読む。広く検索してからソースを開かない。

| 知りたいこと | 文書 |
| --- | --- |
| 利用者の操作 | [docs/user-manual.md](docs/user-manual.md)。手順は [getting-started](docs/user-manual/getting-started.md)、[find-by-intent](docs/user-manual/find-by-intent.md)、[tutorial](docs/user-manual/tutorial.md)、[features](docs/user-manual/features.md) |
| 操作の入口（内部表） | [docs/operation-entries.md](docs/operation-entries.md) |
| 画面と機能の挙動、機能 ID | [docs/external-spec.md](docs/external-spec.md) |
| 仕様を足すときの影響 | [docs/feature-checklist.md](docs/feature-checklist.md) |
| JSON とアプリデータ | [docs/data-format.md](docs/data-format.md)、`docs/*.schema.json` |
| 構成、Tauri、描画、段 8 境界 | [docs/internal-spec.md](docs/internal-spec.md) |
| 循環 import と CI | [docs/model-circular-import-plan.md](docs/model-circular-import-plan.md) |
| テスト | [docs/test-spec.md](docs/test-spec.md) |
| 環境・CI・リリース | [docs/development.md](docs/development.md) |
| 1.x と next のブランチ | [development.md](docs/development.md)（1.x を出しながら次のメジャーを進める） |
| 方針・ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |
| UI デザイン #449 | [docs/design/benchmark.md](docs/design/benchmark.md)、[inventory.md](docs/design/inventory.md) |
| D0 棚卸し・old→new | [docs/agents-d0-inventory.md](docs/agents-d0-inventory.md)、[principles-analysis](docs/agents-d0-principles-analysis.md) |
| 概要 | [README.md](README.md) |

## 変更したら文書も更新する

| 変えたもの | 同じ変更で更新する文書 |
| --- | --- |
| 画面の挙動、操作、表示 | [docs/external-spec.md](docs/external-spec.md)。手順が変わるときは [getting-started](docs/user-manual/getting-started.md)、[find-by-intent](docs/user-manual/find-by-intent.md)、[tutorial](docs/user-manual/tutorial.md)、[features](docs/user-manual/features.md)。読み方だけ [user-manual.md](docs/user-manual.md)。README の機能説明 [README.md](README.md) |
| 操作の入口 | [docs/operation-entries.md](docs/operation-entries.md)、[feature-checklist.md](docs/feature-checklist.md)「操作の入口」 |
| コードの境界・operations | [docs/internal-spec.md](docs/internal-spec.md) |
| 機能 ID・チェックリスト行 | [docs/feature-checklist.md](docs/feature-checklist.md) |
| JSON・schemaVersion | [docs/data-format.md](docs/data-format.md)、`docs/*.schema.json`。[update-schedule-schema](.cursor/skills/update-schedule-schema/SKILL.md)。カレンダー・メンバー・色・workspace は各 write-* スキルと検証を同じ変更で |
| モジュール・状態・Tauri・描画 | [docs/internal-spec.md](docs/internal-spec.md) |
| テスト | [docs/test-spec.md](docs/test-spec.md) |
| 起動・CI・リリース・Pages | [docs/development.md](docs/development.md)。導入 [README.md](README.md)、[getting-started](docs/user-manual/getting-started.md)。LLM [tutorial](docs/user-manual/tutorial.md)。公開 URL [user-manual.md](docs/user-manual.md) |
| 方針・ロードマップ | [docs/PLANNING.md](docs/PLANNING.md) |

通常の不具合修正では [docs/PLANNING.md](docs/PLANNING.md) は更新しない。利用者向けリリースでは [CHANGELOG.md](CHANGELOG.md) も更新する。

## 開発環境（例）

デスクトップは `npm run tauri dev`（[development.md](docs/development.md)）。`src-tauri/target/debug/schedule-viewer` を直接開かない。UI は `http://localhost:1420/`。`schedule-viewer --mcp` は画面プロセスと別。

## 段 8 文書仕上げ（Issue #490）

コード整理（C/T/M・UI/hooks 循環・#524 madge CI）は **feature-436** 上で完了。**D0** = 本 AGENTS の原則化 + inventory。**D1** = skills 再構成 + Issue 本文更新。**D2** = P-CI-06 等の機械化。

**届け方:** `feature-436` → **`next` 合流**。CI・AGENTS の共通ルールは **`develop` にも必要なら cherry-pick または合流 PR**（段 8 専用の境界だけ next 限定可）。

## Issue

GitHub の Issue は gh を使う。

## 個人の学習

個人の好みとマシン固有の事実は `.cursor/rules/personal.local.mdc`。`AGENTS.md` に Learned User Preferences / Workspace Facts を足さない。実行状態は `.cursor/hooks/state/`（Git 外）。

## スキルとルール（索引）

計画には読むスキル名と節を書く。名指しが無いときは `description` が合うスキルを 1 つ。`implement-change` は指定節 + 常に「着手前」。

| 用途 | スキル |
| --- | --- |
| アプリ実装・文書・テスト | [implement-change](.cursor/skills/implement-change/SKILL.md) |
| リリース・CI・配布 | [cut-release](.cursor/skills/cut-release/SKILL.md) |
| 操作マニュアル Pages | [publish-user-manual](.cursor/skills/publish-user-manual/SKILL.md) |
| 全体レビュー | [review-project](.cursor/skills/review-project/SKILL.md) |
| 計画実装のレビュー | [review-implementation](.cursor/skills/review-implementation/SKILL.md) |
| 起動中スケジュール相談 | [schedule-talk](.cursor/skills/schedule-talk/SKILL.md) |
| `/consult` | [consult](.cursor/skills/consult/SKILL.md) + consult.mdc |
| スケジュール JSON | write-schedule（他リポジトリ可） |
| メンバー / カレンダー / 色 / workspace / 拡張項目 | write-members, write-calendar, write-colors, write-workspace, write-fields |
| スケジュール schema | [update-schedule-schema](.cursor/skills/update-schedule-schema/SKILL.md) |

1.x を出しながら next を進める手順は development のみ（専用スキルは作らない）。`next` 切りと次メジャーリリースは cut-release「1.x と次のメジャー」。

スキルの分割・更新はエージェントが同じ作業で行う。半分以上の節が不要なら種類別スキルへ分ける（スキーマ変更は update-schedule-schema のまま）。

レビュー指摘を直すとき、再発防止は該当 SKILL 節へ同じ変更で必ず足す（review-implementation）。計画だけの指摘は足さない。
