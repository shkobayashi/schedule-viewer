# D1 棚卸し（Issue #490）

**D1** = skills / internal-spec の 8 原則索引、日本語 J1–J5、Cloud Agent ガード、Issue #490 更新**提案**（人手）。**D2** → [agents-d2-plan.md](agents-d2-plan.md)。

## 1. スキル・ルール old → new

| 旧 | 新 | 扱い |
| --- | --- | --- |
| implement-change 節見出しのみ | + `## 8 原則と条項`、各節に原則タグ、再発防止段落 | **追加**（条項 1–57 不変） |
| japanese-prose 長文1ファイル | J1–J5 + [japanese-prose-examples.md](japanese-prose-examples.md) | **再構成** |
| consult 直し例重複 | examples 正本、consult はリンク | **移動** |
| internal-spec C/T/M 長表 | 完了履歴短Paragraph + model-circular-import-plan 参照 | **短縮**（詳細は git/Issue 履歴） |
| agents-agent-index Cloud 1行 | + [development.md](development.md) Cloud Agent 節（P-AG-03） | **ガード追加** |
| Issue #490 本文 madge warn | [agents-d1-issue-490-proposal.md](agents-d1-issue-490-proposal.md) | **提案のみ** |
| schedule-talk / #344 | agent-index に consultation-flow 行 | **索引** |
| review-implementation 日本語 | + examples / J 原則 | **拡張** |
| cut-release / publish-user-manual | doc-update-map 参照（変更最小） | **確認** |

| 扱い | 件数 |
| --- | ---: |
| 追加・拡張 | 5 |
| 再構成・移動 | 4 |
| 短縮（履歴参照） | 1 |
| 削除（黙って） | **0** |

日本語詳細: [japanese-prose-d1-inventory.md](japanese-prose-d1-inventory.md)。D0 累積: [agents-d0-inventory.md](agents-d0-inventory.md)。

## 2. ガード（D1 で Exists になったもの）

| ID | ガード | 状態 |
| --- | --- | --- |
| P-AG-03 | [development.md](development.md)「Cursor Cloud Agent」 | **Exists**（D1） |
| P-AG-05 | [agents-d1-issue-490-proposal.md](agents-d1-issue-490-proposal.md) | **Exists**（文案。Issue 更新は人手） |
| P-AG-01 | d0/d1 inventory + PR 対応 | **Exists** |

## 3. consult / schedule-talk（#344）

| 内容 | 正本 |
| --- | --- |
| 起動中の相談の流れ、試し計画 | [schedule-talk/references/consultation-flow.md](../.cursor/skills/schedule-talk/references/consultation-flow.md) |
| 手段の選び方（MCP → read-screen → write-schedule） | [schedule-talk/SKILL.md](../.cursor/skills/schedule-talk/SKILL.md) |
| 相談モードの返答順 | [consult.mdc](../.cursor/rules/consult.mdc) |

Issue #490 の #344 は **schedule-talk reference** に置く方針（D0 inventory §2 の決定を D1 で agent-index に反映）。
