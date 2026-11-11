# 段階ごとの記録（実測）

マージ可能になった Issue ごとにエントリを足す。モデルと effort の固定表は置かない。選んだ理由、手戻り、実コスト、見直しの判断は段階履歴に残し、後から訂正できるようにする。分からない項目は `unknown` のままにする。トークン数はツールが実際に返したときだけ整数で書いてよい。

各エントリの正本は次のとおりである。

- **verified_head_sha** — マージ可能と判断したときの Git の head（40 桁の小文字 HEX）。
- **phase-history** — フェンス内 YAML。フェーズごとの task_type、model_id、effort、selection_rationale、finding_types、fix_rounds、actual_cost、comparison_limits、recheck_decision など。
- **execution-snapshot**（任意） — [scripts/format-check-record.mjs](../scripts/format-check-record.mjs) が **呼び出し側が集めた** コマンド結果から整形した JSON。`shaIdentity.status` が `valid` でも、コマンドが本当にそのツリーで走った証明にはならない。head が更新されると、古いスナップショットは `stale` 扱いになる。

実行記録の整形手順は [.cursor/skills/work-phases/SKILL.md](../.cursor/skills/work-phases/SKILL.md) の「実行スナップショット」を見る。

---

## Issue #551

- **PR:** [#583](https://github.com/shkobayashi/schedule-viewer/pull/583)
- **verified_head_sha:** `693fff1d57c4f1ce6180dd3772fce997f0d392bb`

### phase-history

```yaml
phases:
  - task_type: 計画
    model_id: grok-4.7
    effort: unknown
    selection_rationale: unknown
    finding_types: unknown
    fix_rounds: unknown
  - task_type: 実装
    model_id: composer-2.5
    effort: unknown
    selection_rationale: unknown
    notes: increment 1–4 と証拠の訂正は同じ実装セッション
    fix_rounds: unknown
  - task_type: レビュー
    model_id: grok-4.7
    effort: unknown
  - task_type: 修正
    model_id: composer-2.5
    effort: unknown
merge_summary:
  git_size: "31 テキストファイル +2796 / −53、34 バイナリ"
  review_findings: unknown
  human_edits: unknown
  tokens: unknown
  coordinator_notes: |
    追コミット 693fff1d は test-spec・証拠断言・increment 4 のメモ。
    コーディネータ起動・レビュー記録はテスト・文書・証拠中心。
    初期の撮影ではコントロールが切れていた。
provenance: |
  移行元は旧一行表（2026-03 以前）。effort・トークン・所要時間は記録がなく unknown。
  当時の Cloud Agent 索引に effort 列が無かった。
```

---

## Issue #475

- **PR:** [#584](https://github.com/shkobayashi/schedule-viewer/pull/584)
- **verified_head_sha:** `798f4761693d6a38bb164b85859be98f0238fae7`

### phase-history

```yaml
phases:
  - task_type: 計画
    model_id: grok-4.7
    effort: high
    selection_rationale: unknown
    source: coordinator launch record
  - task_type: 実装
    model_id: composer-2.5
    effort: unknown
    notes: 後続 increment も同じ実装セッション
  - task_type: レビュー
    model_id: grok-4.7
    effort: high
    source: coordinator review record
  - task_type: 修正
    model_id: composer-2.5
    effort: unknown
merge_summary:
  git_size: "26 テキストファイル +1922 / −33、8 バイナリ"
  review_findings: "文書の食い違い 5 件。レビュー完了時点で 5 件とも修正済み。本番コードの欠陥指摘なし。"
  composer_sha_mismatch: "Composer 報告の SHA は git と一致しなかった例あり"
  human_edits: unknown
  tokens: unknown
  fix_rounds: unknown
provenance: |
  移行元は旧一行表。計画・レビューの effort high はコーディネータ起動記録由来。
  実装・修正の effort、修正ラウンド数、トークンは unknown。
```

---

## 見直しメモ（#553 項目 5）

| 日付 | 参照 | 決定 | 理由 |
| --- | --- | --- | --- |
| 2026-11-11 | Issue #553 継続改善の仕組み | **keep** — 固定の難易度×モデル表はまだ置かない | #551 / #475 の実測だけでは因果比較にならない。選定理由と実行記録を段階履歴に残す方針を採用 |
| 2026-11-11 | Issue #553 項目 5 | **change** — 実行スナップショット用に `format-check-record.mjs` を追加 | head SHA とコマンド結果の整形を分離し、生ログをコミットしない |
