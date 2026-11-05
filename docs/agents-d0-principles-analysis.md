# D0 原則分析（Issue #490、8 原則版）

D0 深掘り分析（Agent Store `inbox/agents-md-analysis-geo.md`）と D0 初回（6 原則）を統合した分析。**AGENTS.md は 8 原則のみ**。索引は [agents-agent-index.md](agents-agent-index.md)、更新表正本は [agents-doc-update-map.md](agents-doc-update-map.md)、事故例索引は [agents-pitfall-examples.md](agents-pitfall-examples.md)。old→new と pitfall ID は [agents-d0-inventory.md](agents-d0-inventory.md)。

**段 8 スコープ（#491 を混ぜない、C/T/M 順など）** は AGENTS の恒久原則にしない。作業指示は Issue #490 / [PLANNING.md](PLANNING.md) / [internal-spec.md](internal-spec.md) の履歴節。

## 原則一覧

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

**正本の使い分け（原則 1 と 2 の緊張）:** 調べるときは文書を先に使う。変更するときはソースを正として文書を直す（AGENTS 冒頭）。

## 分析表（抜粋）

| メモの束 | 根本原因 | 原則 | ガード |
| --- | --- | --- | --- |
| 更新表・Schema・MCP 名・図・同梱 | 多面コピー | **1** | [agents-doc-update-map.md](agents-doc-update-map.md)、check:*、mcp-tool-names、MSIX |
| 先に読む文書・計画照合・write-* | 地図を飛ばす／推測 | **2** | [agents-agent-index.md](agents-agent-index.md)、implement-change 着手前・テスト |
| lint・madge・operations 層 | import 向き | **3** | lint、**P-CI-03** madge baseline |
| operation-entries・入口文 | 二重正本 | **4** | 人手、**P-CI-06** 予定 |
| Konva・起動・世代 | スナップショット取り違え | **5** | 特性テスト、IC 10–20 等 |
| palette・layout 戻り・explain 51–54 | 別式 | **6** | layout テスト、IC 51–54 |
| test-spec・手動・誤入力 | テストの形だけ | **7** | npm test、review、**P-AG-02** 予定 |
| スキル分割・inventory・review | 口伝り・削除 | **8** | review-implementation、**P-AG-01** |
| ~~段 8 #491 混ぜない~~ | 作業指示 | *Issue #490* | internal-spec 履歴（**原則外**） |

## old → new（累積、削除 0）

| 旧 AGENTS / D0 v1（P1–P6） | 新（8 原則 + 分割） |
| --- | --- |
| P1 結合文書 | **原則 1** + [agents-doc-update-map.md](agents-doc-update-map.md) |
| P2 依存 | **原則 3** + internal-spec 正本 |
| P3 操作入口 | **原則 4** |
| P4 段 8 スコープ | **削除（原則から）** → agents-agent-index / Issue #490 |
| P5 索引 | **原則 8** + [agents-agent-index.md](agents-agent-index.md) |
| P6 落とし穴 | **原則 5–7** + [agents-pitfall-examples.md](agents-pitfall-examples.md) |
| 先に読む文書・スキル表・開発環境 | [agents-agent-index.md](agents-agent-index.md) |
| 変更したら更新表 | [agents-doc-update-map.md](agents-doc-update-map.md) |
| implement-change 旧 **51** | **51–54** + 旧 52–54 → **55–57** |

D0 直前の節対応の詳細は [agents-d0-inventory.md](agents-d0-inventory.md) §1（初回 D0 表は **保持**し、上表を §1 末尾に追記）。

## implement-change 51 分割

全文保持。 [agents-implement-change-51-split.md](agents-implement-change-51-split.md)。

## D1 / D2

[agents-d0-inventory.md](agents-d0-inventory.md) §4 のとおり（P-CI-06、P-AG-02/03/05、SKILL 先頭の「例の足し方」）。
