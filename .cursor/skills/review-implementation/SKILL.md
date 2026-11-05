---
name: review-implementation
description: >-
  Reviews the schedule-viewer change just implemented from a plan. Covers
  hard-to-notice specification corner cases and failure paths, drift from the
  plan, test coverage, latent bugs, security and performance risks in the
  diff, and documents that disagree with the behavior or are hard to read in
  Japanese. Use when the user asks to review that implementation, including
  「レビューしてください」, without pasting this checklist. Do not use for
  whole-project review, REVIEW.md, or pull request approval.
---

# review-implementation（計画を実装したあとのレビュー）

計画を実装した直後の変更をレビューする。リポジトリ全体を `REVIEW.md` にまとめる作業は [review-project](../review-project/SKILL.md) である。プルリクエストを承認する作業は、このスキルの対象外である。

ファイルは直さない。指摘が無いときは、その旨を書いて終える。直す必要があるときは、修正の計画をチャットに書く。その計画の実装は、頼まれてから [implement-change](../implement-change/SKILL.md) で行う。

## 着手前

1. 範囲は、その会話の計画、実装した差分、計画が更新するとしている文書である。リポジトリ全体は読まない
2. [AGENTS.md](../../../AGENTS.md) に従い、ソースより先に該当する文書を読む
3. 文章の指摘は [.cursor/rules/japanese-prose.mdc](../../rules/japanese-prose.mdc) の **J1–J5** と [docs/japanese-prose-examples.md](../../../docs/japanese-prose-examples.md) に合わせる（**チャット返答も対象**）

## 仕様

計画と、対応する仕様に書いてある挙動を読む。そのうえで、次を探す。

- 気づきにくいコーナーケース。空、0件、未選択、境界の日付や件数など、計画と仕様に書いていない入力
- 異常系。中断、失敗、入力の途中、同時に進む操作
- 計画が機能を足しているとき、[機能チェックリスト](../../../docs/feature-checklist.md) で触れる行のうち、計画と外部仕様のどちらにも書いていないもの

気づいたケースは、どの前提が仕様にも計画にも無いのかを書いて残す。

## 実装

- 計画の意図との齟齬。計画が求めたことが差分に入っているか。計画に無い変更が同じ差分に入っていないか
- **差分の範囲（P-AG-04）:** 循環解消やリファクタで、計画に無いファイル（例: `palette.ts` / `colorScheme.ts`）が全文置換されていないか。implement-change 着手前 8
- **test-spec の表（P-AG-02）:** `docs/test-spec.md` の表を行差し替えしていないか。消した行の手動・自動の対応が残っているか。implement-change「テストと確認」1
- **model の export 配置（P-AG-06）:** `src/model/` で import ブロックの途中に `export` が割り込んでいないか。implement-change 状態 31
- **操作の入口（P-CI-06）:** 入口ラベルや MCP 名を変えたとき、`operation-entries.md` を更新し `npm run check:operation-entries` が通るか
- テスト網羅性。計画が名指しした条件が、テストと [docs/test-spec.md](../../../docs/test-spec.md) に残っているか。照合は implement-change の「テストと確認」に従う
- 潜在的な不具合。境界、失敗、非同期の古い結果、保存と履歴を、差分が触れているときに見る
- セキュリティリスク。差分が Tauri の権限、パス、HTML と SVG、入力の大きさに触れているときだけ見る
- パフォーマンスリスク。差分が描画中の再計算、ポーリング、保存の頻度に触れているときだけ見る

推測だけの指摘は書かない。場所と、そう判断した根拠を付ける。

## implement-change 再発の代表（D2）

[docs/agents-pitfall-examples.md](../../../docs/agents-pitfall-examples.md) と [docs/agents-d0-inventory.md](../../../docs/agents-d0-inventory.md) §3.3 のテーマのうち、差分が触れやすいものを見る。各テーマの**ガード**は inventory §3 を正とする。

- **操作入口・external-spec（P-CI-06）:** `npm run check:operation-entries`、implement-change 画面 3
- **Konva・ポインタ・並べ替え:** Vitest + test-spec 手動（implement-change 画面 10–20, 34–37）
- **起動復旧・ファイル:** `useScheduleStartupRecovery` 等のテスト（画面 15, 19–20；状態 4, 10–11）
- **MCP・read-screen 文言:** `check:mcp-tool-names`、Rust テスト、`MCP_VIEW_IN_READ_TOOLS`
- **文書・test-spec 照合（P-AG-02）:** 上記 test-spec の表
- **JSON スキル同梱:** Rust 件数テスト + MSIX（テスト 13）

## 文書

計画が更新するとしている文書と、[docs/agents-doc-update-map.md](../../../docs/agents-doc-update-map.md) を、実装と比べる。

- 仕様と実際の齟齬
- 日本語として分かりづらい記述

### チャット報告の癖（J1–J5・examples に加える確認）

1. 表と太字ラベルだけで報告書を組んでいないか
2. 「対象: チャット。状態: ある。」のように、項目と値だけを並べていないか
3. J1、P-AG-03、「正本」「束」「入口」など、説明なしの造語や番号を使っていないか
4. Exists、Proposed、Final principles など、英語の見出しやラベルが混ざっていないか
5. ファイル名とテスト件数を先に並べ、読み手にとって何が変わったかが後回しになっていないか
6. 結論より先に、読んだ手順や作業の経過だけを書いていないか
7. 利用者が前から決めている進め方を、「不要です」のように打ち消していないか
8. ほぼ一通り決まっているのに、「進めてよいですか」と質問で止めていないか

接尾辞で絞るファイルダイアログを触ったレビューでは、[docs/external-spec.md](../../../docs/external-spec.md)、操作マニュアル、[docs/internal-spec.md](../../../docs/internal-spec.md) を読み、名前そのものの `schedule.json` や `members.json` などが、接尾辞の種類と JSON の種類のどちらに出るかが揃っているかを見る。

## 結果

チャットに書く。`REVIEW.md` は作らない。

指摘があるときは、修正の計画を続ける。計画には、直すこと、対象ファイル、実装時に読む implement-change の節名を書く。計画と仕上がりのずれを直す計画では、再発を防ぐ手順をどのスキルのどの節へ足すかも書く。ファイルの修正は、このレビューでは行わない。

指摘が無いときは、修正の計画は書かない。

## 完了条件

- 計画、差分、対応する文書を読んだ
- 仕様、実装、文書の各観点について、見た結果を書いた
- 指摘があるときだけ修正の計画があり、無いときは計画を書いていない
