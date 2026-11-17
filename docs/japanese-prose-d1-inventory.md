# 日本語ルール D1 — 旧から新への対応

短い原則: [.cursor/rules/japanese-prose.mdc](../.cursor/rules/japanese-prose.mdc)（**J1–J5**、毎回読み込み）。具体例: [japanese-prose-examples.md](japanese-prose-examples.md)。分析: [japanese-prose-principles-analysis.md](japanese-prose-principles-analysis.md)。

## 意味として D1 初版（PR #526 最初のコミット）で落ちていた文

節の**行き先**は下表のとおり追跡していたが、**会話を支える意味**としては次が prose / examples に無かった。Geo レビュー（`d1-japanese-review.md`）後、本ブランチの追加コミットで復帰した。

| 旧 japanese-prose.mdc の文言（要約） | 復帰先 |
| --- | --- |
| 言葉は作らない。短い名詞は要らない。 | **J3** |
| 読み手が「これは何を言っているのか」と止まりそうな言い回しは使わない | examples §どの文章でも |
| 「つまり」「要するに」「ここで見ているのは」の言い換え（「これが表しているのは〜」の代わり） | J1 + examples §どの文章でも |
| 同じ内容を別の角度から言い直すときは、言い回しも変える | examples §どの文章でも |
| 誰が何をするかで書く（難しい処理のまとめ） | examples §どの文章でも |
| レポートや仕様書の口調にせず、会話として書く | examples §チャット |
| その見出しはレポート調には数えない（相談） | examples §チャット + consult |
| 別の話題では、同じ型で、その話題の名前を使う（直し例の注） | examples §禁止と比喩 |

**黙って条文ごと消したものはない。** 初版では上の**意味**が抜けていたため、「削除 0」だけでは読み手を誤解させる。行き先追跡は維持し、意味の抜けは本表で明示する。

## 旧から新への対応表

| 旧（japanese-prose.mdc / consult.mdc） | 新 | 扱い |
| --- | --- | --- |
| 冒頭「対象はチャット…」+ 言葉は作らない等 | J1–J5 冒頭 + examples リンク | **保持・短縮**（「言葉は作らない」は初版で J3 抜け → 復帰） |
| ## どの文章でも（全箇条書き） | examples §どの文章でも + J1 | **移動**（上表の抜け分を Geo 後に足した） |
| ## 使わない | J3 + examples §禁止と比喩 | **移動** |
| ## 直し方の例（統合スキル） | examples §禁止と比喩（相談） | **移動**（consult と重複解消） |
| AGENTS 向けの言い換え4組（旧 prose） | examples §実装向けの言い換え | **移動** |
| ## チャットの回答 | J2 + examples §チャット | **統合** |
| ## 文書、Issue… | J5 + examples §文書 | **統合** |
| consult §返答の順 | consult.mdc（そのまま） | **保持** |
| consult §始め方〜仕様と設計 | consult.mdc | **保持** |
| consult §例とたとえ | J4 + consult 短縮参照 | **統合** |
| consult §直し方の例 | examples + consult はリンク | **移動** |
| consult §話し方 | consult.mdc + J2 | **分散** |
| consult §問いと作業 | consult.mdc | **保持** |
| agents-agent-index「日本語: japanese-prose」 | + examples / analysis リンク | **拡張** |
| review-implementation 着手前 3 | + examples + チャット癖の確認 | **D1 + Geo** |
| write-* SKILL 内日本語 | 各 SKILL 内（変更なし） | **保持** |

| 扱い | 件数 |
| --- | ---: |
| 保持 | 5 |
| 移動 | 6 |
| 統合・短縮 | 5 |
| 条文ごと黙って削除 | **0** |
| 初版で意味が抜けた（上表） | **8**（Geo レビューで復帰） |
