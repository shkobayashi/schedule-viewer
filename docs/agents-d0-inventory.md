# AGENTS.md / skills 棚卸し（Issue #490 **D0**）

段 8 のコード整理（M・UI・hooks・#524 の madge CI エラー化）**後**の、エージェント向け文書の置き場所と落とし穴の一覧である。**D1** で skills 本文の再構成、**D2** で機械検査と review チェックリストへの落とし込みを行う。

正本の役割分担:

| 層 | 置くもの |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | **8 原則**のみ（根本原因 1–2 行 + ガード + 例へのリンク） |
| [docs/agents-agent-index.md](agents-agent-index.md) | 先に読む文書、スキル表、作業の進め方、境界要約 |
| [docs/agents-doc-update-map.md](agents-doc-update-map.md) | **更新表の正本** |
| [docs/agents-pitfall-examples.md](agents-pitfall-examples.md) | 事故例サンプル・IC 番号 → 原則 |
| [docs/agents-d0-principles-analysis.md](agents-d0-principles-analysis.md) | メモの束 → 根本原因 → 原則 → ガード |
| [docs/agents-d0-inventory.md](agents-d0-inventory.md) | **old → new**、落とし穴 ID、D1/D2 |
| [docs/internal-spec.md](internal-spec.md) | モジュール構成、段 8 の層と import、自動検査の表 |
| [docs/model-circular-import-plan.md](model-circular-import-plan.md) | 循環 import の履歴と CI |
| [.cursor/skills/implement-change/SKILL.md](../.cursor/skills/implement-change/SKILL.md) | 番号付きの具体落とし穴（削らない） |

## ブランチへの届け方（D0 PR 時点）

| ブランチ | いつ載るか | 備考 |
| --- | --- | --- |
| `feature-436` | 本 PR | 段 8 の統合ブランチ |
| `next` | `feature-436` 合流後 | 次メジャー開発の正本。AGENTS / skills / internal-spec は **next へマージで届ける** |
| `develop` | 1.x 保守 | **ルール・CI 文言**（madge エラー化など）は 1.x にも必要なら、合流または cherry-pick で **develop にも同内容を反映**する。段 8 専用の境界記述だけが next 限定の場合は develop では省略可（[docs/development.md](development.md) の CI 表は両方で揃える） |

GitHub Issue #490 本文の「madge / jscpd / coverage: warn」は **#524 以降は古い**（循環 import は `check:madge-circular-baseline` で CI エラー）。Issue 本文の更新は **D1** で行う。

---

## 1. AGENTS.md 節の old → new 対応

**Old** = D0 直前の `AGENTS.md`（#524 マージ後）。**New（PR #525 最終）** = 8 原則のみ + 索引の分割先。

| Old（節・段落） | New の置き場所 | 扱い |
| --- | --- | --- |
| タイトル + 導入 | AGENTS 冒頭（正本の使い分け）+ **原則 1–2** | **保持・統合** |
| 「先に読む文書」表 | [agents-agent-index.md](agents-agent-index.md) | **移動** |
| フィールド / ソース優先 | AGENTS 冒頭 + **原則 1** | **保持** |
| デスクトップ起動 | agents-agent-index「作業の進め方」 | **移動** |
| 内部コードの境界 | **原則 3** + agents-agent-index 要約 + internal-spec 正本 | **分解** |
| 段 8 スコープ（#491 等） | agents-agent-index / Issue #490（**原則から除外**） | **移動**（観点は消さない） |
| D0–D2 / 削除禁止 | **原則 8** + agents-agent-index | **保持** |
| 「変更したら…」表 | [agents-doc-update-map.md](agents-doc-update-map.md) | **移動**（正本） |
| Issue / 個人の学習 | agents-agent-index | **移動** |
| スキル表・長段落 | agents-agent-index + **原則 8** | **移動・統合** |
| consult / review | agents-agent-index + 各 SKILL / consult.mdc | **分散** |

### PR #525 内の再構成（6 原則 → 8 原則）

| D0 v1（コミット 945df89） | D0 v2（本コミット列） | 扱い |
| --- | --- | --- |
| P1–P6 節 + 索引表 | 8 原則 + agent-index / doc-update-map / pitfall-examples | **再分解** |
| P4 段 8 スコープ | 原則外（agent-index へ） | **移動**（ユーザー決定） |
| implement-change 旧 51 | 51–54、旧 52–54 → 55–57 | **分割**（全文保持） |
| 削除（黙って） | — | **0** |

原則定義 → [agents-d0-principles-analysis.md](agents-d0-principles-analysis.md)。

### develop ブランチ AGENTS との差（段 8 で足したもの）

| develop に無く feature-436 で足した行・節 | 新しい正本 |
| --- | --- |
| operation-entries / feature-checklist / find-by-intent | [agents-agent-index.md](agents-agent-index.md) |
| design benchmark / inventory（#449） | agents-agent-index |
| write-workspace / write-fields / write-colors | agents-agent-index + [agents-doc-update-map.md](agents-doc-update-map.md) |
| 「内部コードの境界」節全体 | agents-agent-index 要約 + internal-spec |
| 起動段落の --mcp 注記 | agents-agent-index + development |

**Removed（理由）:** なし。統合・短縮・表化のみ。

### 対応表の集計（AGENTS 節レベル）

| 扱い | 件数 |
| --- | ---: |
| 保持・統合 | 3 |
| 移動 | 7 |
| 再分解（6→8 原則） | 1 |
| 分割（IC 51） | 1 |
| 削除（黙って） | **0** |

8 原則の定義と分析表 → [agents-d0-principles-analysis.md](agents-d0-principles-analysis.md)。

---

## 2. スキル・ルールの old → new（D0 時点）

| 旧の置き場（観点） | D0 後 | D1 で行うこと |
| --- | --- | --- |
| AGENTS 長段落に載っていたスキル列挙 | AGENTS の索引表 | skills の description 整理、重複段落の削除（対応表付き） |
| implement-change 全項目（57） | 同 SKILL **正本**。IC **51–54**（旧 51 分割）、**55–57**（旧 52–54） | 原則索引 [agents-pitfall-examples.md](agents-pitfall-examples.md)、51 全文 [agents-implement-change-51-split.md](agents-implement-change-51-split.md) |
| internal-spec 段 8 ロードマップ | 同（C/T/M 完了反映済み） | 完了済み節を「履歴」に短縮 |
| cut-release / publish-user-manual | 変更なし | D1 で AGENTS 表からのリンク確認のみ |
| schedule-talk / consult | 変更なし | #344 用の置き場所を D1 で決定（Issue #490） |
| japanese-prose / consult.mdc | 変更なし | — |

---

## 3. 落とし穴 → ガード一覧

**Exists** = リポジトリに既にある CI / テスト / スキル節。**Proposed D1/D2** = これから足す。

### 3.1 段 8・エージェント運用

| ID | 落とし穴（観点） | 出典 | ガード | 状態 |
| --- | --- | --- | --- | --- |
| P-AG-01 | AGENTS / skills を短くするときに観点を黙って消す | AGENTS、#490 D1 | 本 inventory + PR 対応表必須 | **Exists**（プロセス） |
| P-AG-02 | test-spec 表で行を「差し替え」て M1/M2 行を落とす | M2/M3 レビュー | review-implementation + 表の diff 確認 | **Proposed D2**（review チェックリスト） |
| P-AG-03 | マージ済みブランチへ再度 push する | Cloud Agent 運用 | ブランチ一覧・PR マージ後は新ブランチ | **Proposed D1**（development.md Cloud Agent 節） |
| P-AG-04 | 循環解消 PR で無関係ファイルを上書き（例: `colorScheme.ts`） | M2 セッション | implement-change 着手前 + diff 自己レビュー | **Proposed D2** |
| P-AG-05 | Issue #490 本文が madge warn のまま | #490 本文 | D1 で Issue 更新 | **Proposed D1** |
| P-AG-06 | `tasks.ts` で export が import ブロックを分割 | M3b レビュー | コードレビュー | **Exists**（修正済みパターンを IC へ D2） |

### 3.2 アーキテクチャ・CI（段 8 PR 1 以降）

| ID | 落とし穴 | 出典 | ガード | 状態 |
| --- | --- | --- | --- | --- |
| P-CI-01 | model が hooks/components を import | #490 PR1 | `npm run lint`（import 境界） | **Exists** |
| P-CI-02 | hooks が components を import | #490 PR1 | 同上 | **Exists** |
| P-CI-03 | 循環 import を増やす | M0–hooks | `npm run check:madge-circular-baseline`（CI **エラー**、#524） | **Exists** |
| P-CI-04 | MCP ツール名と Rust の不一致 | #490 PR1 | `npm run check:mcp-tool-names` | **Exists** |
| P-CI-05 | jscpd 克隆の急増 | PR1 | `npm run check:architecture-warn`（**警告**） | **Exists** |
| P-CI-06 | 操作入口表とコードの drift | #490 維持 | `check-operation-entries`（未実装） | **Proposed D2**（Issue #490 維持の仕組み） |
| P-CI-07 | ベースライン JSON を更新せず madge だけ変える | model-circular-import-plan | baseline 照合 + `check-madge-circular-baseline.test.mjs` | **Exists** |

### 3.3 implement-change の落とし穴（番号 → ガード）

正本は [.cursor/skills/implement-change/SKILL.md](../.cursor/skills/implement-change/SKILL.md)。下表は **テーマ別**。各条項の全文は SKILL を参照（**削除しない**）。

| テーマ | SKILL 節・代表番号 | 主なガード | 状態 |
| --- | --- | --- | --- |
| 着手前・ブランチ | 着手前 1–7 | AGENTS + development + 計画照合 | **Exists**（スキル） |
| 操作入口・external-spec | 画面 3–9、文書 | 人手 + feature-checklist | **Proposed D2**（P-CI-06） |
| Konva・ポインタ・並べ替え | 画面 10–20, 34–37 | Vitest（model/UI 単体）+ test-spec 手動 | **Exists**（部分）+ **Proposed D2**（review 代表項目） |
| 起動復旧・ファイル | 画面 15, 19–20；状態 4, 10–11 | `useScheduleStartupRecovery` / file hooks テスト | **Exists**（部分） |
| MCP・read-screen 文言一致 | 状態 28–29；画面 52 一部 | `mcp_tool_names.rs` テスト、`MCP_VIEW_IN_READ_TOOLS` | **Exists** |
| 説明オーバーレイ・試し行 | 画面 52 | `explainOverlay*.test.ts`、MCP テスト | **Exists** |
| Windows / Tauri / cfg | 状態 16, 19, 25, 29 | `cargo clippy -D warnings`、`cargo test` | **Exists** |
| マニュアル 19 図 | 画面 32 | `capture:manual-screenshots` + スキル完了条件 | **Exists**（スキル） |
| 文書・test-spec 照合 | 文書；テスト 5–13 | review-implementation | **Proposed D2**（チェックリスト化） |
| JSON スキル同梱 | テスト 13 | Rust 件数テスト + MSIX スクリプト | **Exists** |

---

## 4. D1 / D2 分割（この PR の後）

| 段 | 内容 | 主な成果物 |
| --- | --- | --- |
| **D0（本 PR）** | 棚卸し + AGENTS 再構成 + 本 inventory | 対応表、pitfall 表、AGENTS 索引化 |
| **D1** | skills / internal-spec の再構成 | implement-change の索引節、consult/schedule-talk/#344 の置き場、Issue #490 本文更新、旧→新対応表の PR 添付 |
| **D2** | 再発防止の機械化 | `check-operation-entries`（または段階的）、review-implementation / implement-change の P-AG-02/04/06 チェックリスト、必要なら ESLint 追加 |

---

## 5. 関連文書の更新義務（AGENTS 表の写し）

D0 では AGENTS の表を正とする。変更したら同じ変更で更新する文書は AGENTS.md「変更したら文書も更新する」を参照（**削除・統合なし**）。
