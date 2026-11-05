# Issue #490 作業記録（D0–D2 統合）

段 8 後のエージェント向け文書整理（#525–#527）の **分析・old→new・落とし穴 ID** を1ファイルにまとめたもの。**ライブ**な索引・事故例・日本語 examples は [agents-agent-index.md](agents-agent-index.md)、[agents-pitfall-examples.md](agents-pitfall-examples.md)、[japanese-prose-examples.md](japanese-prose-examples.md) のまま。

正本の役割分担:

| 層 | 置くもの |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | **8 原則**のみ |
| [agents-agent-index.md](agents-agent-index.md) | 先に読む文書、スキル表、作業の進め方 |
| [agents-doc-update-map.md](agents-doc-update-map.md) | 更新表 |
| [agents-pitfall-examples.md](agents-pitfall-examples.md) | 事故例・IC 番号 → 原則 |
| **本ファイル** | Issue #490 の分析、D0–D2 対応表、ガード ID |
| [internal-spec.md](internal-spec.md) | モジュール構成、層と import、自動検査 |
| [implement-change/SKILL.md](../.cursor/skills/implement-change/SKILL.md) | 番号付き具体条項（削らない） |

---

## 分析 — 8 原則（旧 `agents-d0-principles-analysis.md`）

D0 深掘り（Agent Store `inbox/agents-md-analysis-geo.md`）と D0 初回（6 原則）を統合した分析。**段 8 スコープ（#491 を混ぜない等）** は AGENTS の恒久原則にしない。作業指示は Issue #490 / [PLANNING.md](PLANNING.md) / internal-spec 履歴節。

### 原則一覧

| # | 一文 | 失敗モード（根本原因） |
| --- | --- | --- |
| **1** | 同じ事実の写しは同じ変更で揃える | 多面コピーの drift |
| **2** | 文書を地図にし、名指しは全部満たす。無いものは作らない | 広い検索・代表 1 件・推測で埋める |
| **3** | 依存は一方向。共有の型と計算は葉へ。循環 0 | 層違反・相互 import |
| **4** | 一操作は全入口と説明文で同じ意味 | 入口だけ直す・文の主語ずれ |
| **5** | 「今の操作」の持ち主を取り違えない | capture / 選択 / IME / 世代 / 起動ロック |
| **6** | 座標・寸法・色・フォントは一計算・一トークン | 別式・座標空間の混同 |
| **7** | 間違った計算でも通らない入力で条件ごとに確認 | テスト追加＝分岐通過の同一視 |
| **8** | スキルは作業種別。再発防止はスキルへ。write-* にアプリ実装を混ぜない | 口伝り・黙って削除 |

**文書とソース:** 調べるときは文書を先に使う。変更するときはソースを正として文書を直す（AGENTS 冒頭）。

### 分析表（抜粋）

| メモの束 | 根本原因 | 原則 | ガード |
| --- | --- | --- | --- |
| 更新表・Schema・MCP 名・図・同梱 | 多面コピー | **1** | doc-update-map、check:*、mcp-tool-names、MSIX |
| 先に読む文書・計画照合・write-* | 地図を飛ばす／推測 | **2** | agent-index、implement-change 着手前・テスト |
| lint・madge・operations 層 | import 向き | **3** | lint、**P-CI-03** madge baseline |
| operation-entries・入口文 | 二重写し | **4** | **P-CI-06** `check:operation-entries` |
| Konva・起動・世代 | スナップショット取り違え | **5** | 特性テスト、IC 10–20 等 |
| palette・layout 戻り・explain 51–54 | 別式 | **6** | layout テスト、IC 51–54 |
| test-spec・手動・誤入力 | テストの形だけ | **7** | npm test、review **P-AG-02** |
| スキル分割・inventory・review | 口伝り・削除 | **8** | review-implementation、**P-AG-01** |
| ~~段 8 #491 混ぜない~~ | 作業指示 | *Issue #490* | internal-spec 履歴（**原則外**） |

### 6 原則 → 8 原則（累積、削除 0）

| 旧 AGENTS / D0 v1（P1–P6） | 新（8 原則 + 分割） |
| --- | --- |
| P1 結合文書 | **原則 1** + doc-update-map |
| P2 依存 | **原則 3** + internal-spec |
| P3 操作入口 | **原則 4** |
| P4 段 8 スコープ | **原則から除外** → agent-index / Issue #490 |
| P5 索引 | **原則 8** + agent-index |
| P6 落とし穴 | **原則 5–7** + pitfall-examples |
| 先に読む文書・スキル表 | agent-index |
| 変更したら更新表 | doc-update-map |
| implement-change 旧 **51** | **51–54** + 旧 52–54 → **55–57** |

AGENTS 節ごとの詳細対応は **§1**。implement-change 51 分割全文は [agents-implement-change-51-split.md](agents-implement-change-51-split.md)。

---

## 0. 作業記録ファイルの統合（Post-D2）

| 統合前のファイル | 本ファイルの節 | 扱い |
| --- | --- | --- |
| `agents-d0-principles-analysis.md` | §分析 | **統合**（削除） |
| `agents-d1-inventory.md` | §6 | **統合**（削除） |
| `agents-d2-inventory.md` | §7 | **統合**（削除） |
| `agents-d2-plan.md` | §7・§8 | **統合**（削除） |

条文ごと黙って削除: **0**（内容は上表の節へ移しただけ）。**統合 TODO（旧 d2-plan）: 完了**（§8）。

---

## ブランチへの届け方

| ブランチ | 備考 |
| --- | --- |
| `feature-436` | 段 8 統合ブランチ |
| `next` | 合流後の次メジャー正本 |
| `develop` | 1.x。ルール・CI 文言は必要なら cherry-pick |

Issue #490 本文の madge 表現更新案は [agents-d1-issue-490-proposal.md](agents-d1-issue-490-proposal.md)（人手）。

---

## 1. AGENTS.md 節の old → new 対応

**Old** = D0 直前の `AGENTS.md`（#524 マージ後）。**New** = 8 原則のみ + 分割先。

| Old（節・段落） | New の置き場所 | 扱い |
| --- | --- | --- |
| タイトル + 導入 | AGENTS 冒頭 + **原則 1–2** | **保持・統合** |
| 「先に読む文書」表 | agent-index | **移動** |
| フィールド / ソース優先 | AGENTS 冒頭 + **原則 1** | **保持** |
| デスクトップ起動 | agent-index「作業の進め方」 | **移動** |
| 内部コードの境界 | **原則 3** + agent-index + internal-spec | **分解** |
| 段 8 スコープ | agent-index / Issue #490 | **移動** |
| D0–D2 / 削除禁止 | **原則 8** + agent-index | **保持** |
| 「変更したら…」表 | doc-update-map | **移動** |
| Issue / 個人の学習 | agent-index | **移動** |
| スキル表・長段落 | agent-index + **原則 8** | **移動・統合** |
| consult / review | agent-index + 各 SKILL | **分散** |

### PR #525 内（6 原則 → 8 原則）

| D0 v1 | D0 v2 | 扱い |
| --- | --- | --- |
| P1–P6 + 索引表 | 8 原則 + 分割 doc | **再分解** |
| P4 段 8 | 原則外 | **移動** |
| IC 旧 51 | 51–54、55–57 | **分割** |
| 黙って削除 | — | **0** |

### develop との差（段 8 で足したもの）

| develop に無い行 | 新しい正本 |
| --- | --- |
| operation-entries / find-by-intent | agent-index |
| design benchmark / inventory | agent-index |
| write-workspace 等 | agent-index + doc-update-map |
| 内部コードの境界 | agent-index + internal-spec |

**Removed:** なし。

| 扱い | 件数 |
| --- | ---: |
| 保持・統合 | 3 |
| 移動 | 7 |
| 再分解 | 1 |
| 分割（IC 51） | 1 |
| 黙って削除 | **0** |

---

## 2. スキル・ルール（D0 時点 → D1 以降）

| 旧の置き場 | D0 後 | 以降 |
| --- | --- | --- |
| AGENTS 長段落スキル列挙 | agent-index | D1: skills 索引 → **§6** |
| implement-change 57 条項 | 同 SKILL 正本 | D1 原則タグ → **§6** |
| internal-spec 段 8 長表 | C/T/M 履歴短縮 | D1 → **§6** |
| japanese-prose | J1–J5 + examples | [japanese-prose-d1-inventory.md](japanese-prose-d1-inventory.md) |
| schedule-talk / consult | 変更なし | **§6** #344 |

---

## 3. 落とし穴 → ガード一覧

### 3.1 段 8・エージェント運用

| ID | 落とし穴 | ガード | 状態 |
| --- | --- | --- | --- |
| P-AG-01 | 短くするとき観点を黙って消す | 本 inventory + PR 対応表 | **Exists** |
| P-AG-02 | test-spec 表の行差し替え | review + IC テスト 1 | **ある**（D2） |
| P-AG-03 | マージ済みブランチへ再 push | development Cloud Agent | **Exists**（D1） |
| P-AG-04 | 無関係ファイル上書き | IC 着手前 8 + review | **ある**（D2） |
| P-AG-05 | Issue #490 本文が古い | agents-d1-issue-490-proposal | **Exists**（文案） |
| P-AG-06 | export が import を分割 | IC 状態 31 + review | **ある**（D2） |

### 3.2 アーキテクチャ・CI

| ID | 落とし穴 | ガード | 状態 |
| --- | --- | --- | --- |
| P-CI-01–02 | import 境界 | lint | **Exists** |
| P-CI-03 | 循環 import | check:madge-circular-baseline | **Exists** |
| P-CI-04 | MCP 名不一致 | check:mcp-tool-names | **Exists** |
| P-CI-05 | jscpd 急増 | check:architecture-warn | **Exists** |
| P-CI-06 | 入口表 drift | check:operation-entries | **ある**（D2） |
| P-CI-07 | baseline 未更新 | check-madge test | **Exists** |

### 3.3 implement-change テーマ → ガード

| テーマ | 代表 | ガード |
| --- | --- | --- |
| 着手前 | 1–8 | スキル + development |
| 操作入口 | 画面 3–9 | check:operation-entries |
| Konva・ポインタ | 10–20 | Vitest + test-spec 手動 + review 再発代表 |
| 起動・MCP 文言 | 15–29, 52 | 各テスト |
| test-spec | テスト 5–13 | review P-AG-02 |
| JSON 同梱 | テスト 13 | Rust + MSIX |

---

## 4. D0–D2 進捗

| 段 | PR | 内容 |
| --- | --- | --- |
| **D0** | #525 | AGENTS 8 原則、agent-index、doc-update-map、pitfall-examples |
| **D1** | #526 | skills 索引、日本語 J1–J5、P-AG-03/05 → **§6** |
| **D2** | #527 | check:operation-entries、review チェック → **§7** |
| **統合** | （本 PR） | §0。analysis / d1 / d2 作業記録ファイルを本ファイルへ |

---

## 5. 更新表

[agents-doc-update-map.md](agents-doc-update-map.md) が更新表の正本（写しのみ、統合なし）。

---

## 6. D1 棚卸し（旧 `agents-d1-inventory.md`）

**D1** = skills / internal-spec 8 原則索引、日本語 J1–J5、Cloud Agent、Issue 文案（人手）。

### 6.1 スキル・ルール old → new

| 旧 | 新 | 扱い |
| --- | --- | --- |
| implement-change 節のみ | + 8 原則と条項、原則タグ | **追加**（1–57 不変） |
| japanese-prose 長文 | J1–J5 + examples | **再構成** |
| consult 直し例重複 | examples 正本 | **移動** |
| internal-spec C/T/M 長表 | 履歴短Paragraph | **短縮** |
| Cloud Agent | development 節 P-AG-03 | **追加** |
| Issue #490 madge | agents-d1-issue-490-proposal | **提案** |
| #344 | consultation-flow 索引 | **索引** |
| review-implementation | J1–J5 + チャット癖 8 | **拡張** |

| 扱い | 件数 |
| --- | ---: |
| 追加・拡張 | 5 |
| 再構成・移動 | 4 |
| 短縮 | 1 |
| 黙って削除 | **0**（日本語意味抜け → japanese-prose-d1-inventory §「落ちていた文」） |

### 6.2 D1 ガード

| ID | 状態 |
| --- | --- |
| P-AG-03 | **ある** |
| P-AG-05 | **ある**（Issue 人手） |
| P-AG-01 | **ある** |

### 6.3 consult / schedule-talk

| 内容 | 参照 |
| --- | --- |
| 相談の流れ | consultation-flow.md |
| 手段の選び方 | schedule-talk SKILL |
| 相談モード | consult.mdc |

---

## 7. D2 棚卸し（旧 `agents-d2-inventory.md` + `agents-d2-plan.md` 成果物）

**D2** = P-CI-06、P-AG-02/04/06、review 再発代表。

### 7.1 old → new

| 旧 | 新 | 扱い |
| --- | --- | --- |
| P-CI-06 未実装 | check-operation-entries + CI | **追加** |
| P-AG-02/04/06 Proposed | IC + review 節 | **追加** |
| review 再発代表なし | review §再発の代表 | **追加** |
| internal-spec 未実装 | check 段階1 | **更新** |
| IC 57 条項 | + 8, 31, 画面3・テスト1 | **拡張** |

| 扱い | 件数 |
| --- | ---: |
| 追加 | 6 |
| 更新 | 4 |
| 黙って削除 | **0** |

### 7.2 D2 で「ある」になったガード

| ID | 止める場所 |
| --- | --- |
| P-CI-06 | CI `check:operation-entries`、node:test |
| P-AG-02 | review test-spec の表、IC テスト 1 |
| P-AG-04 | IC 着手前 8、review 差分の範囲 |
| P-AG-06 | IC 状態 31、review export 配置 |
| 再発代表 | review §implement-change 再発の代表 |

### 7.3 D2 成果物（計画どおり）

| ID | 成果物 | 状態 |
| --- | --- | --- |
| P-CI-06 | check:operation-entries 段階1 | 済 |
| P-AG-02 | review + IC | 済 |
| P-AG-04 | IC 8 + review | 済 |
| P-AG-06 | IC 31 + review | 済 |
| — | review 再発代表節 | 済 |

---

## 8. D2 計画の残り（旧 `agents-d2-plan.md`）

**触らない（済）:** implement-change 1–57 全文、AGENTS 8 原則骨格。

**P-CI-06 段階2（将来）:** 入口表の全列とソースの機械照合。段階1は [check-operation-entries.ts](../scripts/check-operation-entries.ts) 冒頭。

**統合 TODO:** `agents-d0-principles-analysis.md` と inventory の1ファイル化 — **完了**（§0・§分析）。
