# D2 計画（Issue #490 文書仕上げ・残り）

D1 まで: AGENTS 8 原則、skills 索引、日本語 J1–J5、P-AG-03（development）、P-AG-05 文案（Issue は人手更新）。

**D2 実装:** [agents-d2-inventory.md](agents-d2-inventory.md)。下表の ID は D2 でガードを結び付けた。

## D2 の成果物

| ID | 内容 | 成果物 | D2 |
| --- | --- | --- | --- |
| P-CI-06 | 操作入口表とコードの drift | `check:operation-entries`（段階1） | 済 |
| P-AG-02 | test-spec 行の差し替え | review + implement-change テスト 1 | 済 |
| P-AG-04 | 無関係ファイル上書き | implement-change 着手前 8 / review | 済 |
| P-AG-06 | export/import ブロック分割 | implement-change 状態 31 / review | 済 |
| — | implement-change 再発項目の review 代表 | review-implementation 節 | 済 |

## TODO（D2 **マージ後**・別 PR・ユーザー明示）

**`docs/agents-d0-principles-analysis.md` と `docs/agents-d0-inventory.md` を統合するか、Issue #490 本文へ移す。** 二ファイルの役割（分析 vs old→new）を1か所にまとめ、AGENTS / agent-index からリンクを張り替える。D0/D1/D2 の **削除 0** 対応表は統合先に必ず残す。

（D2 PR ではこの TODO を消さない。）

## 触らない（D2 まで）

- implement-change 番号付き 1–57 の全文（D2 は 8・31 と追記のみ）
- AGENTS 8 原則の骨格

## P-CI-06 段階2（将来）

パレット・☰・ショートカット列とソースの全列照合。D2 では段階1のみ。
