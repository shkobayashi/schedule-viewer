# 段階ごとの記録（実測）

マージ可能になった Issue ごとにエントリを足す。モデルと effort の固定表は置かない。選んだ理由、手戻り、実コスト、見直しの判断は段階履歴に残し、後から訂正できるようにする。分からない項目は `unknown` のままにする。トークン数はツールが実際に返したときだけ整数で書いてよい。

各エントリの正本は次のとおりである。

- **verified_head_sha** — いま有効なマージ可能判断の Git head（40 桁の小文字 HEX）。人が PR をマージしたか（`integration_status`）とは別。新しい **レビュー** からさかのぼり、最初に当たった明示的な readiness 判断だけが効く（`review_outcome` の `MERGE-READY` / `NOT-READY` を優先し、無いときだけ findings 先頭の `Ready` / `MERGE-READY` / `Not ready`）。`NOT-READY` のあとは `verified_head_sha` は `null` 必須。readiness を言わないレビューは判断を変えない。統合前 ready は **ready_head_sha**、統合後の別判断は **post_integration_ready_head_sha** に残す。
- **phase-history** — フェンス内 YAML（要約）。`record_ref`、`fix_rounds`、`merge_summary`（rollup）と provenance だけにし、フェーズごとの effort / session / SHA の正本は JSON に書く。
- **phase-record JSON**（#553 実践） — [docs/phase-records/](phase-records/) の構造化 JSON。マークダウンは要約とリンクであり、二重の正本にしない。訂正は **corrections** 配列へ追記し、既存フェーズ行は消さない。**merge_summary** の rollup キー（`tokens` / `actual_cost` / `duration` / `composer_effort`）を `unknown` 以外にするときは、同じ値を **`rollup_observation`**（`{ "key", "value" }`）として **corrections** に追記し、訂正行の `provenance` を空にしない。値を変えるたびに新しい訂正が要る（検査用の例示であり、ツール出力の実行証明ではない）。
- **execution-snapshot**（任意） — [scripts/format-check-record.mjs](../scripts/format-check-record.mjs) が **呼び出し側が集めた** コマンド結果から整形した JSON。`shaIdentity.status` が `valid` でも、コマンドが本当にそのツリーで走った証明にはならない。head が更新されると、古いスナップショットは `stale` 扱いになる。

**fix_rounds** は、実装・テスト・文書本文の手戻り（`修正` で `substantive_fix` が false でないもの）だけを数える。PR 本文だけの訂正、統合マージ、メタデータ訂正は数えない。コスト・トークン・所要時間・Composer の effort は、観測が無ければ `unknown` のままにする。

検証は [scripts/format-check-record.mjs](../scripts/format-check-record.mjs) の `validatePhaseRecord`（単体記録）、`validatePhaseRecordRevision`（追記のみ）、`validateCommittedPhaseRecordFiles`（コミット済み JSON）を使う。根拠はコーディネータが渡した起動・レビュー・修正の記録であり、リポジトリからの推測ではない。

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
  fix_rounds: unknown
  coordinator_notes: |
    追コミット 693fff1d は test-spec・証拠断言・increment 4 のメモ。
    コーディネータ起動・レビュー記録はテスト・文書・証拠中心。
    初期の撮影ではコントロールが切れていた。
provenance: |
  移行元は旧一行表。effort・トークン・所要時間は記録がなく unknown。
  当時の Cloud Agent 索引に effort 列が無かった。コーディネータの起動・レビュー記録と実行ログから分かる範囲だけを書いている。
  計画の軽い見直しは、別の Cloud Agent セッションとして残らないインライン確認であり、索引に無いことだけをもって省略したとは書かない。
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

## Issue #553 — PR #591

- **PR:** [#591](https://github.com/shkobayashi/schedule-viewer/pull/591)（マージ済み）
- **canonical:** [issue-553-pr591.json](phase-records/issue-553-pr591.json)
- **verified_head_sha:** `2add60baa4014c3900cca4f5a77ae73d00aaae1d`（post-integration レビュー run 4 の MERGE-READY 判断。マージコミットとは別）
- **merge_commit_sha:** `4382d4b7eb53e0601ceacd7e508e99c61dee994a`（GitHub ユーザー merge、2026-11-11 20:30:01 JST）
- **ready_head_sha:** `60d5252149558ddf0146866f0cd2f60995ee03e4`（統合前レビュー ready。統合後 ready とは別判断）
- **post_integration_ready_head_sha:** `2add60baa4014c3900cca4f5a77ae73d00aaae1d`（統合 head への post-integration レビュー run 4）
- **fix_rounds:** `2`（実装修正のみ。ユーザー merge と post-integration レビューは含めない）

### phase-history（要約）

計画・レビューは Grok 4.7 **effort high**（`effort_basis: configured`）、実装・修正は Composer 2.5 **effort unknown**。統合マージと post-integration レビューは fix round に含めない。訂正は JSON の `corrections` に追記。

```yaml
record_ref: docs/phase-records/issue-553-pr591.json
fix_rounds: 2
merge_summary:
  composer_effort: unknown
  tokens: unknown
  actual_cost: unknown
provenance: |
  コーディネータ起動・レビュー・修正の記録。統合前 ready と統合後 MERGE-READY は別 SHA。
  スライス作成時点の open 観測と run 4 保留文は corrections に残す。pr_state の現在値は JSON integration_status。
  GitHub ユーザー merge（2026-11-11 20:30:01 JST）を phase 591-merge-user-1 に追記した。
```

---

## Issue #553 — PR #592

- **PR:** [#592](https://github.com/shkobayashi/schedule-viewer/pull/592)（マージ済み）
- **canonical:** [issue-553-pr592.json](phase-records/issue-553-pr592.json)
- **verified_head_sha:** `eb0c804e42a6c1359920da7b202f103124dcbb0a`
- **merge_commit_sha:** `4879ed7a02eb8d6df1ba47c8e4f894bfed83c6b2`
- **fix_rounds:** `1`

### phase-history（要約）

implement-change 分割。計画 run 7・レビュー high（configured）。修正 1 回のあと ready。メタデータ訂正（ベース誤り・SHA 接頭・無関係空白）は fix round に数えない。

```yaml
record_ref: docs/phase-records/issue-553-pr592.json
fix_rounds: 1
merge_summary:
  composer_effort: unknown
  tokens: unknown
  actual_cost: unknown
provenance: |
  コーディネータ記録と GitHub マージ時刻（2026-11-11 20:15:11 JST）。verified_head はマージコミットと別。
```

---

## 見直しメモ（#553 項目 5）

| 日付 | 参照 | 決定 | 理由 |
| --- | --- | --- | --- |
| 2026-11-11 | Issue #553 継続改善の仕組み | **keep** — 固定の難易度×モデル表はまだ置かない | #551 / #475 の実測だけでは因果比較にならない。選定理由と実行記録を段階履歴に残す方針を採用 |
| 2026-11-11 | Issue #553 項目 5 | **change** — 実行スナップショット用に `format-check-record.mjs` を追加 | head SHA とコマンド結果の整形を分離し、生ログをコミットしない |
| 2026-11-11 | Issue #553 段階ログ実践（#591 / #592） | **keep** — 固定の難易度×モデル表はまだ置かない | 実測 2 PR 分を phase-record JSON と検証器で残し、訂正は追記。因果比較はしない |
| 2026-11-11 | Issue #553 段階ログ実践（追記） | **keep** — 履歴 JSON はそのまま、観測欠落は本節へ | check-rerun 回数・スコープ内外ファイル・途中停止・人手編集は coordinator 記録に無いため unknown。項目 5 の実行スナップショットは未採取 |

---

## Issue #553 — 段階ログ実践（観測メモ）

#591 / #592 の phase-record JSON はコミット済みのままにする。次の項目は、既存 JSON の `merge_summary` や coordinator phases からは確定できないため、本メモでは `unknown` と書く（捏造しない）。

| 項目 | #591 | #592 |
| --- | --- | --- |
| check-rerun 回数 | unknown | unknown |
| スコープ内／外ファイル一覧 | unknown | unknown |
| 途中停止（mid-stop） | unknown | unknown |
| 人手編集（human_edits） | unknown | unknown |

既知のまま残す数値: **fix_rounds** は #591 が `2`、#592 が `1`。コスト・トークン・所要時間・composer_effort は JSON どおり `unknown`。

### 固定の評価セット（過去事故の型）

Issue #553「継続改善の仕組み」用。出典は [agents-pitfall-examples.md](agents-pitfall-examples.md) と [agents-d0-inventory.md](agents-d0-inventory.md) §3 の ID のみ（新規の事故は捏造しない）。

| # | 型（要約） | 出典 | 現在のガード |
| --- | --- | --- | --- |
| 1 | 同一事実の二重管理（入口表・版番号・MCP 名など） | 原則 1 サンプル | P-CI-04 `check:mcp-tool-names`、各 IC 条項 |
| 2 | 計画の手動条件の抜け・代表 1 件で済ませる | 原則 2 サンプル | IC 着手前 4–7、review-implementation |
| 3 | model/UI 境界・循環 import | 原則 3 サンプル | **P-CI-03** `check:madge-circular-baseline`、**P-AG-04** |
| 4 | 操作入口の漏れ・二重ダイアログ | 原則 4 サンプル | **P-CI-06** `check:operation-entries` |
| 5 | ポインタ／IME／`fileBusy` の持ち主 | 原則 5 サンプル | Vitest + test-spec 手動 |
| 6 | test-spec 表の行差し替え | **P-AG-02** | review + IC テスト 1 |
| 7 | マージ済みブランチへの再 push | **P-AG-03** | [development.md](development.md)「Cursor Cloud Agent」。マージ済みブランチへの自動拒否は未証明（`beforeShellExecution` は履歴書き換え系のみ） |
| 8 | 検査優先でスキルだけ肥大化 | 原則 8 サンプル | **P-AG-01**、IC 完了条件 |

### #553 受け入れの残り（観測のみ）

- **項目 5（実行スナップショット）:** `format-check-record.mjs` はあるが、本ブランチ作業時点で head SHA・lint/coverage/madge/jscpd の実測入れ子は未採取。SHA 一致だけでは実行証明にならない。
- **相談モードの遅延読み込み:** 本セッションでは consult 本文の reload を観測していない。
- **hook の live deny:** `beforeShellExecution` はリポジトリにあるが、本セッションで禁止 git 操作のブロックは観測していない（既存の「live 未証明」観測のまま）。
- **#553 完了・P-CI-06 完了・Issue クローズ:** 主張しない。#595 マージ後も未照合セルがあり得る。
