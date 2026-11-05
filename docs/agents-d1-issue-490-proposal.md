# Issue #490 本文の更新案（D1・**提案のみ**）

GitHub Issue は**編集しない**。人が貼り替えるときの文案である（P-AG-05）。

## 背景

#524 マージ後、**循環 import** は `npm run check:madge-circular-baseline` で CI **frontend が失敗で止まる**（`scripts/madge-circular-baseline.json` は `cycleCount: 0`）。**jscpd**（`check:architecture-warn`）と **coverage**（`test:coverage-warn`）だけが警告のまま。

Issue 本文の PR 1 表や「madge warn」表現は **#524 以前の記述**が残っている。

## 差し替え案（PR 1 の行）

**旧（意図）:** `check-mcp-tool-names`、import 境界 ESLint、madge/jscpd/coverage **CI warn**

**新:**

| 検査 | CI |
| --- | --- |
| `check:mcp-tool-names` | 失敗で止める |
| ESLint import 境界 | 失敗で止める |
| `check:madge-circular-baseline` | 失敗で止める（循環 0 件。増減時は baseline JSON を同 PR で更新） |
| `check:architecture-warn`（jscpd） | 警告のみ |
| `test:coverage-warn` | 警告のみ |

## 差し替え案（方針・operations）

**旧:** `src/operations/`（PR 2 以降）

**新:** `src/operations/` に操作 ID と入口定義。**配置済み**。実行は hooks。

## 差し替え案（D0–D2 進捗）

**追記:**

- **D0** — 完了（#525）。AGENTS 8 原則、agents-agent-index / doc-update-map / pitfall-examples。
- **D1** — skills 原則索引、internal-spec 履歴短縮、Cloud Agent 運用（development.md）、本提案文案、日本語 J1–J5。
- **D2** — 未着手（`check-operation-entries`、review チェックリスト等）。**TODO:** D2 後に `agents-d0-principles-analysis.md` と `agents-d0-inventory.md` を **1 ファイルに統合するか Issue 本文へ移す**（ユーザー指示。忘れないこと）。

## 参照

現状の正本: [docs/development.md](development.md) npm 表、[docs/internal-spec.md](internal-spec.md) 段 8 自動検査、[docs/model-circular-import-plan.md](model-circular-import-plan.md)。
