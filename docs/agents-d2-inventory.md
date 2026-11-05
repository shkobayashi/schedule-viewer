# D2 棚卸し（Issue #490）

**D2** = 残りガード（P-CI-06、P-AG-02/04/06）、review チェックリスト、implement-change 条項の追記。**D0/D1 の対応表は消さない** — 累積は [agents-d0-inventory.md](agents-d0-inventory.md) §3。

計画: [agents-d2-plan.md](agents-d2-plan.md)（**TODO:** D2 マージ後の d0 分析+inventory 統合は別 PR）。

## 1. old → new（D2 で足した・変えたもの）

| 旧 | 新 | 扱い |
| --- | --- | --- |
| P-CI-06 未実装 | `scripts/check-operation-entries.ts` + CI + test-spec | **追加** |
| P-AG-02 Proposed | review-implementation「test-spec の表」+ IC テスト 1 | **追加** |
| P-AG-04 Proposed | IC 着手前 8 + review「差分の範囲」 | **追加** |
| P-AG-06 コードのみ | IC 状態 31 + review「model の export 配置」 | **追加** |
| review 再発代表なし | review §implement-change 再発の代表 | **追加** |
| internal-spec 入口「未実装」 | `check:operation-entries` 段階1 | **更新** |
| AGENTS 原則 4 Proposed | `check:operation-entries` | **更新** |
| agents-pitfall P-CI-06 / P-AG-02 | ガード文言 | **更新** |
| implement-change 57 条項 | + 着手前 8、状態 31、画面 3・テスト 1 追記 | **拡張**（番号 1–57 維持） |

| 扱い | 件数 |
| --- | ---: |
| 追加（CI・スクリプト） | 1 |
| 追加（スキル・review） | 5 |
| 更新（文書・索引） | 4 |
| 条文ごと黙って削除 | **0** |

## 2. 落とし穴 → ガード（D2 で「ある」になったもの）

| ID | ガードの種類 | 止める場所 |
| --- | --- | --- |
| P-CI-06 | CI | `npm run check:operation-entries`（frontend job）、`scripts/check-operation-entries.test.mjs` |
| P-AG-02 | スキル | review-implementation「test-spec の表」、implement-change テスト 1 |
| P-AG-04 | スキル | implement-change 着手前 8、review「差分の範囲」 |
| P-AG-06 | スキル | implement-change 状態 31、review「model の export 配置」 |
| 再発代表 | スキル | review-implementation §implement-change 再発の代表 |

## 3. P-CI-06 段階2（未実装・観点は残す）

入口表の**全列**（パレット・☰・ショートカット等）とソースの機械照合は D2 範囲外。段階1 で止める drift は [check-operation-entries.ts](../scripts/check-operation-entries.ts) 冒頭コメント参照。

## 4. consult / schedule-talk

D1 から変更なし（#344 → consultation-flow）。
