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
3. 文章の指摘は [.cursor/rules/japanese-prose.mdc](../../rules/japanese-prose.mdc) に合わせる

## 仕様

計画と、対応する仕様に書いてある挙動を読む。そのうえで、次を探す。

- 気づきにくいコーナーケース。空、0件、未選択、境界の日付や件数など、計画と仕様に書いていない入力
- 異常系。中断、失敗、入力の途中、同時に進む操作

気づいたケースは、どの前提が仕様にも計画にも無いのかを書いて残す。

## 実装

- 計画の意図との齟齬。計画が求めたことが差分に入っているか。計画に無い変更が同じ差分に入っていないか
- テスト網羅性。計画が名指しした条件が、テストと [docs/test-spec.md](../../../docs/test-spec.md) に残っているか。照合は implement-change の「テストと確認」に従う
- 潜在的な不具合。境界、失敗、非同期の古い結果、保存と履歴を、差分が触れているときに見る
- セキュリティリスク。差分が Tauri の権限、パス、HTML と SVG、入力の大きさに触れているときだけ見る
- パフォーマンスリスク。差分が描画中の再計算、ポーリング、保存の頻度に触れているときだけ見る

推測だけの指摘は書かない。場所と、そう判断した根拠を付ける。

## 文書

計画が更新するとしている文書と、[AGENTS.md](../../../AGENTS.md) の「変更したら文書も更新する」で同じ変更に含める文書を、実装と比べる。

- 仕様と実際の齟齬
- 日本語として分かりづらい記述

## 結果

チャットに書く。`REVIEW.md` は作らない。

指摘があるときは、修正の計画を続ける。計画には、直すこと、対象ファイル、実装時に読む implement-change の節名を書く。計画と仕上がりのずれを直す計画では、再発を防ぐ手順をどのスキルのどの節へ足すかも書く。ファイルの修正は、このレビューでは行わない。

指摘が無いときは、修正の計画は書かない。

## 完了条件

- 計画、差分、対応する文書を読んだ
- 仕様、実装、文書の各観点について、見た結果を書いた
- 指摘があるときだけ修正の計画があり、無いときは計画を書いていない
