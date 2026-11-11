---
name: work-phases
description: >-
  Splits agent work into plan, implementation, review, and fix sessions; records
  merge-ready outcomes in docs/agents-phase-log.md. Use for multi-phase PR work
  and coordinator handoffs—not for app UI, JSON skills, or release cuts.
---

# 段階で進める

計画からマージ可能な状態まで、段階とセッションの切り方を揃える。ツール名やボット名を必須にしない。Cursor Cloud Agent の git 禁止事項は [docs/development.md](../../../docs/development.md)「Cursor Cloud Agent」を見る。文書の同時更新は [docs/agents-doc-update-map.md](../../../docs/agents-doc-update-map.md) の「段階の手順と記録」行に従う。

## 段階

フェーズごとに分ける。実装では、小さく確認した単位を同じ実装セッションに留める。

1. **計画** — 強いモデルで計画モードに入る。実装、PR、マージはしない。
2. **計画の見直し** — コーディネータがその計画を短く見直す。別セッションの実装ではない。別の Cloud Agent 実行として必ず起動する、という意味でもない。
3. **実装** — 新しいセッションを開き、使うモデルを最初に書く。計画セッションはモデルを切り替えず、実装をサブエージェントへ任せない。確認済みの単位はこのセッションに残す。
4. **レビュー** — また新しいセッションを計画モードで開き、[review-implementation](../review-implementation/SKILL.md) に従う。そのセッションではファイルを編集しない。
5. **修正** — 実装用の新しいセッションを開く。小さな修正が一つ二つなら、同じセッションに留めてよい。
6. **続行** — コーディネータは、人がマージできる状態になるまで続ける。マージは人が行う。続けてよいか止まって確認しない。

既定の割り当てとして、計画とレビューに Grok 系、実装と修正に Composer 系を使う例がある。作業の難しさや用途に応じて、別の強いモデルや effort の高い設定を選んでもよい。同種の作業で足りなかったことが [docs/agents-phase-log.md](../../../docs/agents-phase-log.md) に記録されるまで、難易度とモデルの固定表はこのスキルには書かない。

## 文章

計画、ブリーフ、実装報告は英語で書く。語と語の間は通常のスペースを入れる。チャットの返答、画面、仕様、利用者向けマニュアルは [.cursor/rules/japanese-prose.mdc](../../rules/japanese-prose.mdc) の **J1–J5** に沿った自然な日本語にする。

## 証拠

スクリーンショットが示すのは、その画像の枠の中に写っている内容だけである。比べる画像どうしで、日付の範囲、スクロール位置、幅、開いているパネルを揃える。画面が同じに見えることと、別の経路（ネイティブ UI と MCP など）で同じ結果が届くことは別の主張である。別経路はその経路用の試験で確かめる。報告に書くコミット SHA は、`git` または GitHub で読み直してから書く。

## 検査

どの場面で何を回すかは、既存の表に任せる。[.cursor/rules/when-to-run-tests.mdc](../../rules/when-to-run-tests.mdc)、[implement-change](../implement-change/SKILL.md)「テストと確認」、[docs/development.md](../../../docs/development.md)「場面ごとに回す検査」を見る。表の直後にある `src-tauri/` と文書だけの修正についての二文は、そこで三か所同じ文言に揃えてある。

試験は「試した」「終わった」「通った」を分けて書く。測っていない秒数は測っていないままにする。閾値、除外、skip の扱いは既存どおりである。[docs/development.md](../../../docs/development.md) に書いてある依存の入れ方で足りるものを、理由なく省略しない。Rust を途中まで直しているときの lib 限定の clippy と test は、表の直後の文に従う。`mcp_running_app` を含む全体の `cargo test --locked` は、PR 前の一回、リリース前、CI に任せる。手元で統合試験を回す前提（アプリの起動状態など）は、[docs/development.md](../../../docs/development.md) の既存の説明に従う。

## 記録

Issue がマージ可能になったら、[docs/agents-phase-log.md](../../../docs/agents-phase-log.md) に一行足す。分からない列は `unknown` のままにする。トークン数は、ツールが実際に返したときだけ書く。サイズは git の差分行数であり、難易度のスコアではない。別 Issue どうしで作業が違うとき、一方の手順がもう一方より手戻りが少なかったと因果では書かない。

## 操作の対称

人が UI でできることは MCP と CLI からもできる方向を標準とする。逆方向（JSON を貼る専用 UI、画面操作の自動再生、画面ごとの置き換え UI）は求めない。文言の正本は [docs/operation-entries.md](../../../docs/operation-entries.md) の冒頭である。このスキルではそこへ指すだけにする。
