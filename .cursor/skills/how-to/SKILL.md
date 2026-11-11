---
name: how-to
description: >-
  Answers how to operate schedule-viewer when the user explicitly asks for
  operation steps (やり方を教えて, 操作を教えて, どう操作するか). Not for schedule edits,
  JSON authoring, or consultation — use schedule-talk and write-schedule instead.
  Do not suggest features the user did not ask about.
---

# how-to

操作を教えてと明示されたときだけ使います。スケジュールの変更依頼や JSON の作成依頼、相談は `schedule-talk` と `write-schedule` に渡します。気づいていない機能を提案しません。

## 手順を返す

1. まず [manual/find-by-intent.md](manual/find-by-intent.md) を読みます。質問に関係する操作は、同じフォルダの [manual/features.md](manual/features.md) の見出しを開きます。索引がはじめにやチュートリアルを指しているときだけ、同じフォルダのそのファイルを開きます。公開ページや起動中のアプリからマニュアルは読みません。
2. 返すのは手順一つです。手順を先に書きます。確実ではないという前置きを手順の前に置きません。箇所を見せて終わりません。複数の機能にまたがるときも、材料は複数でも手順は一つにまとめます。
3. 手順のあと、その手順に出た操作について、マニュアルにある箇所だけを `ファイル名#見出しid` の形で短く添えます。ファイル名は `manual/` のファイル名だけです。id は見出しの表示文字列ではなく、manual-site と同じ slug です。本文は引き写しません。関係の薄い箇所は足しません。最後に、うまくいかないときはそこを読む、と一言添えます。
4. 答えを確実な解決策とは約束しません。実装されていない機能を、できないと判定してから答える段は置きません。手順が正しい保証はしません。
